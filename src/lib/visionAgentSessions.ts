export type VisionAgentSession = {
	session_id: string;
	call_id: string;
	session_started_at: string;
};

const activeSessionsByCallId = new Map<string, VisionAgentSession>();
const startingSessionsByCallId = new Map<string, Promise<VisionAgentSession>>();

export function getActiveVisionAgentSession(callId: string) {
	return activeSessionsByCallId.get(callId);
}

export function setActiveVisionAgentSession(callId: string, session: VisionAgentSession) {
	activeSessionsByCallId.set(callId, session);
}

export function clearActiveVisionAgentSession(callId: string) {
	activeSessionsByCallId.delete(callId);
}

export function getStartingVisionAgentSession(callId: string) {
	return startingSessionsByCallId.get(callId);
}

export function setStartingVisionAgentSession(
	callId: string,
	sessionPromise: Promise<VisionAgentSession>,
) {
	startingSessionsByCallId.set(callId, sessionPromise);
}

export function clearStartingVisionAgentSession(callId: string) {
	startingSessionsByCallId.delete(callId);
}
