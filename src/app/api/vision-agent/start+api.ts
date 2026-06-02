type ClerkTokenPayload = {
	sub?: string;
};

type StartAgentRequest = {
	callId?: string;
	callType?: "audio_room";
};

const agentServerUrl = process.env.VISION_AGENT_SERVER_URL ?? "http://localhost:8000";

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

function isSignedIn(request: Request) {
	const authorization = request.headers.get("authorization");
	const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
	const payload = token ? decodeJwtPayload(token) : null;

	return Boolean(payload?.sub);
}

export async function POST(request: Request) {
	if (!isSignedIn(request)) {
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

	try {
		const response = await fetch(
			`${agentServerUrl.replace(/\/$/, "")}/calls/${encodeURIComponent(body.callId)}/sessions`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ call_type: body.callType }),
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
		console.error("Vision Agent start failed:", error);
		return jsonError("Unable to reach the AI teacher service.", 502);
	}
}
