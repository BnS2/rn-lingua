import asyncio
import logging
import os
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import dotenv_values
from fastapi import Header, HTTPException, status
from vision_agents.core import Agent, AgentLauncher, Runner, ServeOptions, User
from vision_agents.core.agents.events import (
    AgentTurnEndedEvent,
    AgentTurnStartedEvent,
    UserTranscriptEvent,
    UserTurnEndedEvent,
    UserTurnStartedEvent,
)
from vision_agents.core.instructions import Instructions
from vision_agents.core.llm.events import LLMResponseFinalEvent
from vision_agents.plugins import gemini, getstream


logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[1]
ROOT_ENV_PATH = ROOT_DIR / ".env"
SERVICE_ENV_PATH = Path(__file__).resolve().parent / ".env"

AGENT_USER = User(
    id="ai-language-teacher",
    name="AI Language Teacher",
)

DEFAULT_SELECTED_LANGUAGE = "the selected lesson language"
MIN_LEARNER_ATTEMPTS_BEFORE_COMPLETION = 2
LESSON_COMPLETION_TIMEOUT_SECONDS = 180
LANGUAGE_NAME_BY_CODE = {
    "es": "Spanish",
    "fr": "French",
    "ja": "Japanese",
}


def load_environment() -> None:
    for env_path in (ROOT_ENV_PATH, SERVICE_ENV_PATH):
        should_override = env_path == SERVICE_ENV_PATH

        for key, value in dotenv_values(env_path).items():
            if value and (should_override or not os.getenv(key)):
                os.environ[key] = value

    stream_api_key = os.getenv("STREAM_API_KEY") or os.getenv(
        "EXPO_PUBLIC_STREAM_API_KEY"
    )
    if stream_api_key:
        os.environ.setdefault("STREAM_API_KEY", stream_api_key)


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def verify_agent_request(authorization: Optional[str] = Header(default=None)) -> None:
    shared_secret = os.getenv("VISION_AGENT_SHARED_SECRET")

    if not shared_secret:
        return

    expected_authorization = f"Bearer {shared_secret}"

    if authorization != expected_authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Vision Agent authorization.",
        )


def get_nested_text(data: dict[str, Any], *keys: str) -> Optional[str]:
    current: Any = data

    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)

    return current if isinstance(current, str) and current else None


def get_language_from_call_id(call_id: str) -> Optional[str]:
    parts = call_id.split("-")

    if len(parts) < 2 or parts[0] != "lesson":
        return None

    return LANGUAGE_NAME_BY_CODE.get(parts[1])


def format_goals(goals: Any) -> str:
    if not isinstance(goals, list):
        return "- Practice a short beginner conversation."

    lines = []
    for goal in goals[:5]:
        if isinstance(goal, dict) and isinstance(goal.get("text"), str):
            lines.append(f"- {goal['text']}")

    return "\n".join(lines) or "- Practice a short beginner conversation."


def format_vocabulary(vocabulary: Any) -> str:
    if not isinstance(vocabulary, list):
        return "- Use simple beginner words."

    lines = []
    for item in vocabulary[:8]:
        if not isinstance(item, dict):
            continue

        term = item.get("term")
        translation = item.get("translation")
        pronunciation = item.get("pronunciation")

        if isinstance(term, str) and isinstance(translation, str):
            suffix = f"; pronunciation: {pronunciation}" if isinstance(pronunciation, str) else ""
            lines.append(f"- {term}: {translation}{suffix}")

    return "\n".join(lines) or "- Use simple beginner words."


def format_phrases(phrases: Any) -> str:
    if not isinstance(phrases, list):
        return "- Use short phrases from the current lesson."

    lines = []
    for phrase in phrases[:8]:
        if not isinstance(phrase, dict):
            continue

        text = phrase.get("text")
        translation = phrase.get("translation")
        pronunciation = phrase.get("pronunciation")
        context = phrase.get("context")

        if isinstance(text, str) and isinstance(translation, str):
            parts = [f"- {text}: {translation}"]
            if isinstance(pronunciation, str):
                parts.append(f"pronunciation: {pronunciation}")
            if isinstance(context, str):
                parts.append(f"context: {context}")
            lines.append("; ".join(parts))

    return "\n".join(lines) or "- Use short phrases from the current lesson."


def get_lesson_target_items(lesson_context: dict[str, Any]) -> list[dict[str, Any]]:
    ai_teacher = lesson_context.get("aiTeacher")
    if not isinstance(ai_teacher, dict):
        return []

    target_items: list[dict[str, Any]] = []

    for item in ai_teacher.get("vocabulary") or []:
        if not isinstance(item, dict):
            continue

        item_id = item.get("id")
        term = item.get("term")

        if isinstance(item_id, str) and isinstance(term, str):
            target_items.append(
                {
                    "id": item_id,
                    "kind": "vocabulary",
                    "text": term,
                    "translation": item.get("translation"),
                    "pronunciation": item.get("pronunciation"),
                }
            )

    for phrase in ai_teacher.get("phrases") or []:
        if not isinstance(phrase, dict):
            continue

        phrase_id = phrase.get("id")
        text = phrase.get("text")

        if isinstance(phrase_id, str) and isinstance(text, str):
            target_items.append(
                {
                    "id": phrase_id,
                    "kind": "phrase",
                    "text": text,
                    "translation": phrase.get("translation"),
                    "pronunciation": phrase.get("pronunciation"),
                }
            )

    return target_items


def normalize_spoken_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return " ".join(
        "".join(character.lower() if character.isalnum() else " " for character in normalized).split()
    )


def is_target_completed_by_transcript(target: dict[str, Any], transcript: str) -> bool:
    target_terms = [
        target.get("text"),
        target.get("translation"),
        target.get("pronunciation"),
    ]
    normalized_transcript = normalize_spoken_text(transcript)

    for term in target_terms:
        if not isinstance(term, str):
            continue

        normalized_target = normalize_spoken_text(term)
        if normalized_target and normalized_target in normalized_transcript:
            return True

    return False


def find_completed_target_index(
    lesson_targets: list[dict[str, Any]],
    transcript: str,
) -> Optional[int]:
    for index, target in enumerate(lesson_targets):
        if is_target_completed_by_transcript(target, transcript):
            return index

    return None


def fetch_call_custom_data(call_type: str, call_id: str) -> dict[str, Any]:
    stream = getstream.Client(
        api_key=required_env("STREAM_API_KEY"),
        api_secret=required_env("STREAM_API_SECRET"),
    )
    call = stream.video.call(call_type, call_id)
    response = call.get()
    custom = response.data.call.custom

    return custom if isinstance(custom, dict) else {}


def create_stream_rest_call(call_type: str, call_id: str):
    stream = getstream.Client(
        api_key=required_env("STREAM_API_KEY"),
        api_secret=required_env("STREAM_API_SECRET"),
    )

    return stream.video.call(call_type, call_id)


def get_participant_user_id(participant: Any) -> Optional[str]:
    user = getattr(participant, "user", None)
    user_id = getattr(user, "id", None) or getattr(participant, "user_id", None)

    return user_id if isinstance(user_id, str) and user_id else None


def build_instructions(
    selected_language: str, lesson_context: Optional[dict[str, Any]] = None
) -> str:
    lesson_context = lesson_context or {}
    language = (
        get_nested_text(lesson_context, "language", "name")
        or lesson_context.get("languageName")
        or selected_language
    )
    lesson_title = (
        get_nested_text(lesson_context, "lesson", "title")
        or lesson_context.get("lessonTitle")
        or "today's lesson"
    )
    lesson_description = (
        get_nested_text(lesson_context, "lesson", "description")
        or lesson_context.get("lessonDescription")
        or "Practice a useful beginner conversation."
    )
    ai_teacher = lesson_context.get("aiTeacher")
    teacher_prompt = (
        ai_teacher.get("prompt")
        if isinstance(ai_teacher, dict) and isinstance(ai_teacher.get("prompt"), str)
        else lesson_context.get("aiTeacherPrompt")
    )
    goals = ai_teacher.get("goals") if isinstance(ai_teacher, dict) else None
    vocabulary = ai_teacher.get("vocabulary") if isinstance(ai_teacher, dict) else None
    phrases = ai_teacher.get("phrases") if isinstance(ai_teacher, dict) else None

    return f"""
You are the AI language teacher for a Duolingo-inspired mobile app.

You are voice-only. Do not mention video, cameras, screens, images, or visual analysis.

By default, always speak English. Teach {language} through English.
Use short, friendly, spoken replies that are easy for beginners to follow.

Current lesson:
- Title: {lesson_title}
- Description: {lesson_description}

Lesson goals:
{format_goals(goals)}

Vocabulary to prioritize:
{format_vocabulary(vocabulary)}

Phrases to practice:
{format_phrases(phrases)}

Teacher prompt from the app:
{teacher_prompt or "Guide the learner through the phrases and vocabulary above."}

Teaching style:
- Explain one small idea at a time.
- Give the learner short {language} phrases and English meanings.
- Use the exact lesson text and exact pronunciation shown above. Do not invent alternate spellings such as "sa-va" when the lesson pronunciation says "sah vah".
- When you present a lesson word or phrase, say the original lesson text first, then say "pronounced ..." with the exact pronunciation from the lesson list.
- Ask the learner to repeat, translate, or answer with a short phrase.
- Correct mistakes gently and clearly.
- Wait for the learner's actual spoken attempt before giving feedback.
- Do not say "nice job", "great job", "well done", "you got it", or any congratulatory feedback unless the learner has just spoken a real attempt.
- If you ask the learner to say a word or phrase, stop talking after the prompt so they have room to answer or interrupt.
- After the learner speaks, give one specific piece of feedback about what they said, then ask for the next short attempt.
- Work through the lesson vocabulary and phrases one at a time in the exact order listed above.
- If the learner's attempt is unclear or does not sound like the current lesson word or phrase, correct it and ask them to repeat that same item again before moving on.
- On the final lesson item, do not give the wrap-up until you have given feedback on the learner's final attempt and the attempt is acceptable.
- After the learner has acceptably practiced every lesson item, give a short, honest wrap-up: name one thing they practiced and one thing to repeat next time.
- After that wrap-up, stay available if the learner repeats a word, asks to try again, or needs one more correction.
- Do not tell the learner the call is ending. The app will let them choose when to finish.
- Keep each turn under 3 sentences unless the learner asks for more detail.

If the learner asks to switch languages, continue speaking English while teaching the new selected language.
""".strip()


def build_kickoff_prompt(selected_language: str, instructions: str) -> str:
    return f"""
{instructions}

Start the lesson now with your first spoken turn only.
Say hello, introduce the first word or phrase from the lesson list in {selected_language}, give its English meaning, say the exact lesson pronunciation, then ask the learner to repeat it.
End your turn immediately after asking them to repeat so there is a clear pause for the learner to speak or interrupt.
Do not evaluate, congratulate, or say "nice job" before the learner has responded.
Do not continue to the next phrase until you have heard the learner's attempt.
""".strip()


async def create_agent(
    selected_language: Optional[str] = None,
    lesson_context: Optional[dict[str, Any]] = None,
) -> Agent:
    load_environment()
    required_env("STREAM_API_KEY")
    required_env("STREAM_API_SECRET")
    required_env("GOOGLE_API_KEY")
    language = selected_language or os.getenv(
        "VISION_AGENT_SELECTED_LANGUAGE", DEFAULT_SELECTED_LANGUAGE
    )

    realtime_model = os.getenv("GEMINI_REALTIME_MODEL")
    llm = gemini.Realtime(model=realtime_model) if realtime_model else gemini.Realtime()

    return Agent(
        edge=getstream.Edge(),
        agent_user=AGENT_USER,
        instructions=build_instructions(language, lesson_context),
        llm=llm,
        processors=[],
    )


async def join_call(agent: Agent, call_type: str, call_id: str) -> None:
    try:
        lesson_context = fetch_call_custom_data(call_type, call_id)
        selected_language = (
            get_nested_text(lesson_context, "language", "name")
            or lesson_context.get("languageName")
            or get_language_from_call_id(call_id)
            or os.getenv("VISION_AGENT_SELECTED_LANGUAGE", DEFAULT_SELECTED_LANGUAGE)
        )
        logger.info(
            "Starting AI teacher for call %s:%s with selected language: %s",
            call_type,
            call_id,
            selected_language,
        )
        instructions = build_instructions(str(selected_language), lesson_context)
        agent.instructions = Instructions(input_text=instructions)
        edge_call = await agent.create_call(call_type, call_id)
        rest_call = create_stream_rest_call(call_type, call_id)
        lesson_targets = get_lesson_target_items(lesson_context)
        minimum_attempts_for_completion = max(
            MIN_LEARNER_ATTEMPTS_BEFORE_COMPLETION,
            len(lesson_targets),
        )
        current_target_index = 0
        learner_attempt_count = 0
        teacher_feedback_count = 0
        completed_target_ids: set[str] = set()
        has_pending_learner_feedback = False
        has_finished_required_targets = False
        has_emitted_ready_to_finish = False
        lesson_completed = asyncio.Event()

        async def emit_caption_status(
            speaker: str,
            status: str,
            text: Optional[str] = None,
            speaker_id: Optional[str] = None,
        ) -> None:
            payload = {
                "kind": "audio_lesson_caption_status",
                "speaker": speaker,
                "status": status,
                "sentAt": datetime.now(timezone.utc).isoformat(),
            }

            if text:
                payload["text"] = text

            if speaker_id:
                payload["speakerId"] = speaker_id

            try:
                await asyncio.to_thread(
                    rest_call.send_call_event,
                    user_id=AGENT_USER.id,
                    custom=payload,
                )
            except Exception:
                logger.exception("Failed to send caption status event.")

        async def emit_lesson_target(reason: str) -> None:
            if not lesson_targets:
                return

            target_index = min(current_target_index, len(lesson_targets) - 1)
            target = lesson_targets[target_index]
            payload = {
                "kind": "audio_lesson_target",
                "targetItemId": target["id"],
                "targetKind": target["kind"],
                "targetText": target["text"],
                "targetTranslation": target.get("translation"),
                "targetPronunciation": target.get("pronunciation"),
                "targetIndex": target_index,
                "targetCount": len(lesson_targets),
                "reason": reason,
                "sentAt": datetime.now(timezone.utc).isoformat(),
            }

            try:
                await asyncio.to_thread(
                    rest_call.send_call_event,
                    user_id=AGENT_USER.id,
                    custom=payload,
                )
            except Exception:
                logger.exception("Failed to send lesson target event.")

        async def emit_closed_caption(
            speaker: str,
            text: str,
            speaker_id: Optional[str] = None,
        ) -> None:
            if not text:
                return

            caption_speaker_id = speaker_id or f"audio-lesson-{speaker}"
            caption_payload = {
                "speaker_id": caption_speaker_id,
                "text": text,
                "language": "auto",
                "service": "vision-agent",
            }

            if speaker_id or speaker == "teacher":
                caption_payload["user_id"] = caption_speaker_id

            try:
                await asyncio.to_thread(
                    rest_call.send_closed_caption,
                    **caption_payload,
                )
            except Exception:
                logger.exception("Failed to send Vision Agent closed caption.")

        async def emit_lesson_ready_to_finish() -> None:
            completed_target_count = (
                len(completed_target_ids)
                if lesson_targets
                else min(learner_attempt_count, minimum_attempts_for_completion)
            )
            attempted_every_target = (
                completed_target_count >= len(lesson_targets)
                if lesson_targets
                else learner_attempt_count >= minimum_attempts_for_completion
            )
            covered_target_count = min(
                max(completed_target_count, current_target_index + 1, learner_attempt_count),
                max(len(lesson_targets), 1),
            )
            target_count = max(len(lesson_targets), 1)
            payload = {
                "kind": "audio_lesson_ready_to_finish",
                "sentAt": datetime.now(timezone.utc).isoformat(),
                "ratings": {
                    "speaking": (
                        f"{learner_attempt_count} attempt"
                        f"{'' if learner_attempt_count == 1 else 's'}"
                    ),
                    "pronunciation": f"{covered_target_count}/{target_count} items",
                    "grammar": "Review anytime" if attempted_every_target else "Repeat aloud",
                },
                "comments": [
                    (
                        f"You practiced {covered_target_count} of {target_count} lesson item"
                        f"{'' if target_count == 1 else 's'}."
                    ),
                    (
                        "You can finish now or repeat one more time for extra confidence."
                    ),
                ],
            }

            try:
                await asyncio.to_thread(
                    rest_call.send_call_event,
                    user_id=AGENT_USER.id,
                    custom=payload,
                )
            except Exception:
                logger.exception("Failed to send lesson ready-to-finish event.")

        @agent.events.subscribe
        async def on_agent_turn_started(event: AgentTurnStartedEvent) -> None:
            await emit_caption_status("teacher", "started", speaker_id=AGENT_USER.id)

        @agent.events.subscribe
        async def on_agent_turn_ended(event: AgentTurnEndedEvent) -> None:
            await emit_caption_status("teacher", "ended", speaker_id=AGENT_USER.id)

        @agent.events.subscribe
        async def on_user_turn_started(event: UserTurnStartedEvent) -> None:
            speaker_id = get_participant_user_id(event.participant)
            logger.info("Learner turn started: %s", speaker_id or "unknown")
            await emit_caption_status("learner", "started", speaker_id=speaker_id)

        @agent.events.subscribe
        async def on_user_turn_ended(event: UserTurnEndedEvent) -> None:
            speaker_id = get_participant_user_id(event.participant)
            logger.info("Learner turn ended: %s", speaker_id or "unknown")
            await emit_caption_status("learner", "ended", speaker_id=speaker_id)

        @agent.events.subscribe
        async def on_user_transcript(event: UserTranscriptEvent) -> None:
            nonlocal current_target_index, has_pending_learner_feedback, learner_attempt_count

            speaker_id = get_participant_user_id(event.participant)
            await emit_caption_status(
                "learner",
                "transcript",
                text=event.text,
                speaker_id=speaker_id,
            )
            await emit_closed_caption("learner", event.text, speaker_id=speaker_id)

            if event.text.strip():
                logger.info("Learner transcript: %s", event.text.strip())
                learner_attempt_count += 1
                if lesson_targets:
                    fallback_target_index = min(current_target_index, len(lesson_targets) - 1)
                    matched_target_index = find_completed_target_index(lesson_targets, event.text)
                    if matched_target_index is not None:
                        target = lesson_targets[matched_target_index]
                        target_id = target.get("id")

                        if isinstance(target_id, str):
                            completed_target_ids.add(target_id)
                            current_target_index = min(
                                max(current_target_index, matched_target_index + 1),
                                len(lesson_targets) - 1,
                            )
                    else:
                        current_target_index = fallback_target_index
                has_pending_learner_feedback = True

        @agent.events.subscribe
        async def on_llm_response_final(event: LLMResponseFinalEvent) -> None:
            nonlocal current_target_index, has_finished_required_targets, has_pending_learner_feedback, teacher_feedback_count, has_emitted_ready_to_finish

            await emit_caption_status(
                "teacher",
                "transcript",
                text=event.text,
                speaker_id=AGENT_USER.id,
            )
            await emit_closed_caption("teacher", event.text, speaker_id=AGENT_USER.id)

            if not has_pending_learner_feedback:
                return

            teacher_feedback_count += 1
            has_pending_learner_feedback = False
            previous_target_index = current_target_index

            if lesson_targets:
                target_ids = [
                    target["id"]
                    for target in lesson_targets
                    if isinstance(target.get("id"), str)
                ]
                has_finished_required_targets = all(
                    target_id in completed_target_ids for target_id in target_ids
                )

                if not has_finished_required_targets:
                    current_target_index = next(
                        (
                            index
                            for index, target in enumerate(lesson_targets)
                            if target.get("id") not in completed_target_ids
                        ),
                        current_target_index,
                    )
            else:
                has_finished_required_targets = (
                    learner_attempt_count >= minimum_attempts_for_completion
                    and teacher_feedback_count >= minimum_attempts_for_completion
                )

            if not has_finished_required_targets:
                await emit_lesson_target(
                    "next" if current_target_index != previous_target_index else "retry"
                )
                return

            if not has_emitted_ready_to_finish:
                has_emitted_ready_to_finish = True
                await emit_lesson_ready_to_finish()

        async with agent.join(edge_call, participant_wait_timeout=0):
            await emit_lesson_target("initial")
            await agent.simple_response(build_kickoff_prompt(str(selected_language), instructions))

            try:
                await asyncio.wait_for(
                    lesson_completed.wait(),
                    timeout=LESSON_COMPLETION_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                logger.info(
                    "Audio lesson completion timeout for call %s:%s after %s learner attempts.",
                    call_type,
                    call_id,
                    learner_attempt_count,
                )

            if learner_attempt_count > 0 and not has_emitted_ready_to_finish:
                await emit_lesson_ready_to_finish()

            await agent.finish()
    except Exception as error:
        logger.exception(
            "Gemini AI teacher failed to join call %s:%s.",
            call_type,
            call_id,
        )
        raise
    finally:
        await agent.close()


def main() -> None:
    load_environment()
    Runner(
        AgentLauncher(
            create_agent=create_agent,
            join_call=join_call,
            agent_idle_timeout=60.0,
        ),
        serve_options=ServeOptions(
            can_start_session=verify_agent_request,
            can_close_session=verify_agent_request,
            can_view_session=verify_agent_request,
            can_view_metrics=verify_agent_request,
        ),
    ).cli()


if __name__ == "__main__":
    main()
