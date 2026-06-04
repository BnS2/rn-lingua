import { getSignedInUser, isClerkAuthConfigError } from "@/lib/clerkAuth";
import { createStreamServerClient } from "@/lib/streamServer";
import type { StreamAudioCallRequest, StreamAudioCallSession } from "@/types/stream";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const agentUserId = "ai-language-teacher";
const startingAudioCallSessionsByKey = new Map<string, Promise<StreamAudioCallSession>>();

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

function createCallId(userId: string, lessonId: string, languageCode: string) {
	const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(-12);
	const safeLessonId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 24);
	const safeLanguageCode = languageCode.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 4);
	const sessionId = Date.now().toString(36);

	return `lesson-${safeLanguageCode}-${safeLessonId}-${safeUserId}-${sessionId}`;
}

function createAudioCallSessionKey(userId: string, lessonId: string, languageCode: string) {
	return `${userId}:${languageCode}:${lessonId}`;
}

function isString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStringFields(value: unknown, fields: string[]) {
	return isRecord(value) && fields.every((field) => isString(value[field]));
}

function isValidAudioCallRequest(value: unknown): value is StreamAudioCallRequest {
	if (!isRecord(value)) {
		return false;
	}

	return (
		isString(value.lessonId) &&
		isString(value.lessonTitle) &&
		isString(value.lessonDescription) &&
		isString(value.languageCode) &&
		isString(value.languageName) &&
		isString(value.aiTeacherPrompt) &&
		Array.isArray(value.goals) &&
		value.goals.every((goal) => hasStringFields(goal, ["id", "text"])) &&
		Array.isArray(value.vocabulary) &&
		value.vocabulary.every((item) =>
			hasStringFields(item, ["id", "term", "translation", "pronunciation", "partOfSpeech"]),
		) &&
		Array.isArray(value.phrases) &&
		value.phrases.every((phrase) =>
			hasStringFields(phrase, ["id", "text", "translation", "pronunciation", "context"]),
		)
	);
}

export async function POST(request: Request) {
	if (!apiKey || !apiSecret) {
		return jsonError("Stream API key or secret is not configured.", 500);
	}

	let signedInUser;

	try {
		signedInUser = await getSignedInUser(request);
	} catch (error) {
		if (isClerkAuthConfigError(error)) {
			return jsonError(error.message, 500);
		}

		throw error;
	}

	if (!signedInUser) {
		return jsonError("Sign in before starting an audio lesson call.", 401);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return jsonError("Invalid request body.", 400);
	}

	if (!isValidAudioCallRequest(body)) {
		return jsonError("Lesson and language context are required.", 400);
	}

	const sessionKey = createAudioCallSessionKey(signedInUser.id, body.lessonId, body.languageCode);
	const startingSession = startingAudioCallSessionsByKey.get(sessionKey);

	if (startingSession) {
		return Response.json(await startingSession);
	}

	const sessionPromise = createAudioCallSession(signedInUser, body);
	startingAudioCallSessionsByKey.set(sessionKey, sessionPromise);

	try {
		return Response.json(await sessionPromise);
	} finally {
		if (startingAudioCallSessionsByKey.get(sessionKey) === sessionPromise) {
			startingAudioCallSessionsByKey.delete(sessionKey);
		}
	}
}

async function createAudioCallSession(
	signedInUser: NonNullable<Awaited<ReturnType<typeof getSignedInUser>>>,
	body: StreamAudioCallRequest,
) {
	if (!apiKey || !apiSecret) {
		throw new Error("Stream API key or secret is not configured.");
	}

	const stream = createStreamServerClient(apiKey, apiSecret);
	const userName = signedInUser.name || body.userName || "Language learner";
	const userImage = signedInUser.image ?? body.userImage;
	const callId = createCallId(signedInUser.id, body.lessonId, body.languageCode);
	const callType = "audio_room" as const;

	await stream.upsertUsers([
		{
			id: signedInUser.id,
			name: userName,
			image: userImage,
		},
		{
			id: agentUserId,
			name: "AI Language Teacher",
			role: "admin",
		},
	]);

	const call = stream.video.call(callType, callId);
	const lessonContext = {
		id: body.lessonId,
		title: body.lessonTitle,
		description: body.lessonDescription,
	};
	const languageContext = {
		code: body.languageCode,
		name: body.languageName,
	};
	const teacherContext = {
		prompt: body.aiTeacherPrompt,
		goals: body.goals,
		vocabulary: body.vocabulary,
		phrases: body.phrases,
	};

	await call.getOrCreate({
		video: false,
		data: {
			created_by_id: signedInUser.id,
			video: false,
			members: [{ user_id: signedInUser.id }, { user_id: agentUserId, role: "admin" }],
			settings_override: {
				transcription: {
					mode: "available",
					closed_caption_mode: "available",
					language: "auto",
					speech_segment_config: {
						max_speech_caption_ms: 5000,
						silence_duration_ms: 300,
					},
				},
			},
			custom: {
				lessonId: body.lessonId,
				lessonTitle: body.lessonTitle,
				lessonDescription: body.lessonDescription,
				languageCode: body.languageCode,
				languageName: body.languageName,
				sessionKind: "audio-lesson",
				lesson: lessonContext,
				language: languageContext,
				aiTeacher: teacherContext,
			},
		},
	});
	await call.updateCallMembers({
		update_members: [{ user_id: agentUserId, role: "admin" }],
	});
	await call.updateUserPermissions({
		user_id: agentUserId,
		grant_permissions: ["send-audio"],
	});
	await call.updateUserPermissions({
		user_id: signedInUser.id,
		grant_permissions: ["send-audio"],
	});

	try {
		await call.goLive({ start_closed_caption: true });
	} catch (error) {
		console.warn("Stream audio room goLive failed or was already live:", error);
	}

	const token = stream.generateUserToken({
		user_id: signedInUser.id,
		validity_in_seconds: 60 * 60 * 4,
	});

	const session: StreamAudioCallSession = {
		apiKey,
		callId,
		callType,
		token,
		userId: signedInUser.id,
		userName,
		userImage,
		lessonId: body.lessonId,
		lessonTitle: body.lessonTitle,
		languageCode: body.languageCode,
		languageName: body.languageName,
	};

	return session;
}
