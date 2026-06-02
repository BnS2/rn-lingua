import logging
import os
from pathlib import Path
from typing import Any, Optional

from dotenv import dotenv_values
from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.core.instructions import Instructions
from vision_agents.plugins import gemini, getstream


logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[1]
ROOT_ENV_PATH = ROOT_DIR / ".env"
SERVICE_ENV_PATH = Path(__file__).resolve().parent / ".env"

AGENT_USER = User(
    id="ai-language-teacher",
    name="AI Language Teacher",
)

DEFAULT_SELECTED_LANGUAGE = "Spanish"


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


def get_nested_text(data: dict[str, Any], *keys: str) -> Optional[str]:
    current: Any = data

    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)

    return current if isinstance(current, str) and current else None


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
            suffix = f" ({pronunciation})" if isinstance(pronunciation, str) else ""
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
        context = phrase.get("context")

        if isinstance(text, str) and isinstance(translation, str):
            suffix = f" - {context}" if isinstance(context, str) else ""
            lines.append(f"- {text}: {translation}{suffix}")

    return "\n".join(lines) or "- Use short phrases from the current lesson."


def fetch_call_custom_data(call_type: str, call_id: str) -> dict[str, Any]:
    stream = getstream.Client(
        api_key=required_env("STREAM_API_KEY"),
        api_secret=required_env("STREAM_API_SECRET"),
    )
    call = stream.video.call(call_type, call_id)
    response = call.get()
    custom = response.data.call.custom

    return custom if isinstance(custom, dict) else {}


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
- Ask the learner to repeat, translate, or answer with a short phrase.
- Correct mistakes gently and clearly.
- Celebrate progress without being wordy.
- Keep each turn under 3 sentences unless the learner asks for more detail.

If the learner asks to switch languages, continue speaking English while teaching the new selected language.
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
            or os.getenv("VISION_AGENT_SELECTED_LANGUAGE", DEFAULT_SELECTED_LANGUAGE)
        )
        agent.instructions = Instructions(
            input_text=build_instructions(str(selected_language), lesson_context)
        )
        call = await agent.create_call(call_type, call_id)

        async with agent.join(call, participant_wait_timeout=0):
            await agent.simple_response(
                "Greet the learner and start the lesson with the first short phrase."
            )
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
        )
    ).cli()


if __name__ == "__main__":
    main()
