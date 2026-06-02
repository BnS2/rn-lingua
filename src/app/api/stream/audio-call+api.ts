import { StreamClient } from "@stream-io/node-sdk";
import type { StreamAudioCallRequest, StreamAudioCallSession } from "@/types/stream";

type ClerkTokenPayload = {
	sub?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	image_url?: string;
	picture?: string;
};

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const agentUserId = "ai-language-teacher";

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

function decodeJwtPayload(token: string): ClerkTokenPayload | null {
	const payload = token.split(".")[1];

	if (!payload) {
		return null;
	}

	try {
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
		return JSON.parse(atob(padded)) as ClerkTokenPayload;
	} catch {
		return null;
	}
}

function getSignedInUser(request: Request) {
	const authorization = request.headers.get("authorization");
	const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
	const payload = token ? decodeJwtPayload(token) : null;

	if (!payload?.sub) {
		return null;
	}

	const fallbackName = [payload.given_name, payload.family_name].filter(Boolean).join(" ");

	return {
		id: payload.sub,
		name: payload.name ?? fallbackName,
		image: payload.image_url ?? payload.picture,
	};
}

function createCallId(userId: string, lessonId: string, languageCode: string) {
	const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	const safeLessonId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	const safeLanguageCode = languageCode.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 12);

	return `lesson-${safeLanguageCode}-${safeLessonId}-${safeUserId}`;
}

export async function POST(request: Request) {
	if (!apiKey || !apiSecret) {
		return jsonError("Stream API key or secret is not configured.", 500);
	}

	const signedInUser = getSignedInUser(request);

	if (!signedInUser) {
		return jsonError("Sign in before starting an audio lesson call.", 401);
	}

	let body: StreamAudioCallRequest;

	try {
		body = (await request.json()) as StreamAudioCallRequest;
	} catch {
		return jsonError("Invalid request body.", 400);
	}

	if (
		!body.lessonId ||
		!body.lessonTitle ||
		!body.lessonDescription ||
		!body.languageCode ||
		!body.languageName ||
		!body.aiTeacherPrompt
	) {
		return jsonError("Lesson and language context are required.", 400);
	}

	const stream = new StreamClient(apiKey, apiSecret);
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
			settings_override: {
				audio: {
					default_device: "speaker",
					mic_default_on: true,
					speaker_default_on: true,
				},
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

	try {
		await call.goLive();
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

	return Response.json(session);
}
