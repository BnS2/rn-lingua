import { getSignedInUser } from "@/lib/clerkAuth";

type StartAgentRequest = {
	callId?: string;
	callType?: "audio_room";
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
		return jsonError("Sign in before starting the AI teacher.", 401);
	}

	let body: StartAgentRequest;

	try {
		body = (await request.json()) as StartAgentRequest;
	} catch {
		return jsonError("Invalid request body.", 400);
	}

	if (!body.callId || body.callType !== "audio_room") {
		return jsonError("Audio room call context is required.", 400);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), agentRequestTimeoutMs);

	try {
		const response = await fetch(
			`${agentServerUrl.replace(/\/$/, "")}/calls/${encodeURIComponent(body.callId)}/sessions`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ call_type: body.callType }),
				signal: controller.signal,
			},
		);

		const responseBody = (await response.json().catch(() => null)) as unknown;
		if (!response.ok) {
			return Response.json(
				{ error: "Unable to start the AI teacher.", details: responseBody },
				{ status: response.status },
			);
		}

		return Response.json(responseBody, { status: 201 });
	} catch (error) {
		if (isAbortError(error)) {
			console.error("Vision Agent start timed out:", error);
			return jsonError("The AI teacher service timed out.", 504);
		}

		console.error("Vision Agent start failed:", error);
		return jsonError("Unable to reach the AI teacher service.", 502);
	} finally {
		clearTimeout(timeout);
	}
}
