import { StreamClient } from "@stream-io/node-sdk";

type ClerkTokenPayload = {
	sub?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	image_url?: string;
	picture?: string;
};

type StreamSession = {
	apiKey: string;
	token: string;
	userId: string;
	userName: string;
	userImage?: string;
};

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

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

export async function GET(request: Request) {
	if (!apiKey || !apiSecret) {
		return jsonError("Stream API key or secret is not configured.", 500);
	}

	const signedInUser = getSignedInUser(request);

	if (!signedInUser) {
		return jsonError("Sign in before connecting to Stream.", 401);
	}

	const stream = new StreamClient(apiKey, apiSecret);
	const userName = signedInUser.name || "Language learner";

	await stream.upsertUsers([
		{
			id: signedInUser.id,
			name: userName,
			image: signedInUser.image,
		},
	]);

	const session: StreamSession = {
		apiKey,
		token: stream.generateUserToken({
			user_id: signedInUser.id,
			validity_in_seconds: 60 * 60 * 4,
		}),
		userId: signedInUser.id,
		userName,
		userImage: signedInUser.image,
	};

	return Response.json(session);
}
