import { StreamClient } from "@stream-io/node-sdk";

const defaultStreamRequestTimeoutMs = 15000;

function getStreamRequestTimeoutMs() {
	const timeoutMs = Number(process.env.STREAM_REQUEST_TIMEOUT_MS);

	return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : defaultStreamRequestTimeoutMs;
}

export function createStreamServerClient(apiKey: string, apiSecret: string) {
	return new StreamClient(apiKey, apiSecret, {
		timeout: getStreamRequestTimeoutMs(),
	});
}
