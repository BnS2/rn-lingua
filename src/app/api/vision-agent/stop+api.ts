import { getSignedInUser } from "@/lib/clerkAuth";

type StopAgentRequest = {
	callId?: string;
	sessionId?: string;
};

const agentServerUrl = process.env.VISION_AGENT_SERVER_URL ?? "http://localhost:8000";
const agentRequestTimeoutMs = Number(process.env.VISION_AGENT_REQUEST_TIMEOUT_MS ?? 8000);

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

export async function POST(request: Request) {
	const signedInUser = await getSignedInUser(request);

	if (!signedInUser) {
		return jsonError("Sign in before stopping the AI teacher.", 401);
	}

	let body: StopAgentRequest;

	try {
		body = (await request.json()) as StopAgentRequest;
	} catch {
		return jsonError("Invalid request body.", 400);
	}

	if (!body.callId || !body.sessionId) {
		return jsonError("Agent session context is required.", 400);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), agentRequestTimeoutMs);

	try {
		const response = await fetch(
			`${agentServerUrl.replace(/\/$/, "")}/calls/${encodeURIComponent(
				body.callId,
			)}/sessions/${encodeURIComponent(body.sessionId)}`,
			{ method: "DELETE", signal: controller.signal },
		);

		if (!response.ok && response.status !== 404) {
			const responseBody = (await response.json().catch(() => null)) as unknown;
			return Response.json(
				{ error: "Unable to stop the AI teacher.", details: responseBody },
				{ status: response.status },
			);
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		if (isAbortError(error)) {
			console.error("Vision Agent stop timed out:", error);
			return jsonError("The AI teacher service timed out.", 504);
		}

		console.error("Vision Agent stop failed:", error);
		return jsonError("Unable to reach the AI teacher service.", 502);
	} finally {
		clearTimeout(timeout);
	}
}
