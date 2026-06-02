import { StreamClient } from "@stream-io/node-sdk";
import { getSignedInUser } from "@/lib/clerkAuth";

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

export async function GET(request: Request) {
	if (!apiKey || !apiSecret) {
		return jsonError("Stream API key or secret is not configured.", 500);
	}

	const signedInUser = await getSignedInUser(request);

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
