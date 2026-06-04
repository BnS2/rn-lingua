import { getSignedInUser, isClerkAuthConfigError } from "@/lib/clerkAuth";
import {
	clearStartingVisionAgentSession,
	getActiveVisionAgentSession,
	getStartingVisionAgentSession,
	setActiveVisionAgentSession,
	setStartingVisionAgentSession,
	type VisionAgentSession,
} from "@/lib/visionAgentSessions";

const agentServerUrl = process.env.VISION_AGENT_SERVER_URL ?? "http://localhost:8000";
const agentSharedSecret = process.env.VISION_AGENT_SHARED_SECRET;

type StartAgentRequest = {
	callId?: string;
	callType?: "audio_room";
};

function getAgentRequestTimeoutMs() {
	const timeoutMs = Number(process.env.VISION_AGENT_REQUEST_TIMEOUT_MS);
	return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000;
}

const agentRequestTimeoutMs = getAgentRequestTimeoutMs();

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === "AbortError";
}

function getAgentHeaders() {
	const headers = new Headers({ "Content-Type": "application/json" });

	if (agentSharedSecret) {
		headers.set("Authorization", `Bearer ${agentSharedSecret}`);
	}

	return headers;
}

function isVisionAgentSession(value: unknown): value is VisionAgentSession {
	if (!value || typeof value !== "object") {
		return false;
	}

	return (
		"session_id" in value &&
		"call_id" in value &&
		"session_started_at" in value &&
		typeof value.session_id === "string" &&
		typeof value.call_id === "string" &&
		typeof value.session_started_at === "string"
	);
}

export async function POST(request: Request) {
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

	const activeSession = getActiveVisionAgentSession(body.callId);
	if (activeSession) {
		return Response.json(activeSession, { status: 200 });
	}

	const startingSession = getStartingVisionAgentSession(body.callId);
	if (startingSession) {
		try {
			return Response.json(await startingSession, { status: 200 });
		} catch {
			if (getStartingVisionAgentSession(body.callId) === startingSession) {
				clearStartingVisionAgentSession(body.callId);
			}
		}
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), agentRequestTimeoutMs);
	const startSessionPromise = fetch(
		`${agentServerUrl.replace(/\/$/, "")}/calls/${encodeURIComponent(body.callId)}/sessions`,
		{
			method: "POST",
			headers: getAgentHeaders(),
			body: JSON.stringify({ call_type: body.callType }),
			signal: controller.signal,
		},
	).then(async (response) => {
		const responseBody = (await response.json().catch(() => null)) as unknown;

		if (!response.ok) {
			throw Response.json(
				{ error: "Unable to start the AI teacher.", details: responseBody },
				{ status: response.status },
			);
		}

		if (!isVisionAgentSession(responseBody)) {
			throw jsonError("The AI teacher service returned an invalid session.", 502);
		}

		setActiveVisionAgentSession(body.callId as string, responseBody);
		return responseBody;
	});

	setStartingVisionAgentSession(body.callId, startSessionPromise);

	try {
		return Response.json(await startSessionPromise, { status: 201 });
	} catch (error) {
		if (error instanceof Response) {
			return error;
		}

		if (isAbortError(error)) {
			console.error("Vision Agent start timed out:", error);
			return jsonError(
				`The AI teacher service timed out after ${agentRequestTimeoutMs}ms. Make sure the Vision Agent server is running and reachable at ${agentServerUrl}.`,
				504,
			);
		}

		console.error("Vision Agent start failed:", error);
		return jsonError("Unable to reach the AI teacher service.", 502);
	} finally {
		if (getStartingVisionAgentSession(body.callId) === startSessionPromise) {
			clearStartingVisionAgentSession(body.callId);
		}
		clearTimeout(timeout);
	}
}
