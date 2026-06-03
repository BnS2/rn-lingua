import Constants from "expo-constants";
import { Platform } from "react-native";

const defaultDevServerPort = "8081";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

function isLocalhost(host: string) {
	return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function getHostAndPort(uri?: string | null, defaultPort = defaultDevServerPort) {
	if (!uri) {
		return null;
	}

	const normalizedUri = uri.includes("://") ? uri : `http://${uri}`;

	try {
		const url = new URL(normalizedUri);

		if (!url.hostname) {
			return null;
		}

		return {
			host: url.hostname,
			port: url.port || defaultPort,
		};
	} catch {
		const [host, port] = uri.split(":");

		if (!host) {
			return null;
		}

		return {
			host,
			port: port || defaultPort,
		};
	}
}

function getTailscaleDevServerUrl(port = defaultDevServerPort) {
	const magicDnsHost = process.env.EXPO_PUBLIC_TAILSCALE_MAGIC_DNS_HOST?.trim();
	const parsed = getHostAndPort(magicDnsHost, port);

	if (!parsed) {
		return null;
	}

	return `http://${parsed.host}:${parsed.port}`;
}

function getDevServerUrl() {
	const manifest = Constants.manifest as { debuggerHost?: string; hostUri?: string } | null;
	const hostCandidate =
		Constants.expoConfig?.hostUri ??
		Constants.expoGoConfig?.debuggerHost ??
		Constants.platform?.hostUri ??
		manifest?.debuggerHost ??
		manifest?.hostUri ??
		Constants.linkingUri ??
		Constants.experienceUrl;
	const parsed = getHostAndPort(hostCandidate);

	if (parsed) {
		if (isLocalhost(parsed.host)) {
			return getTailscaleDevServerUrl(parsed.port) ?? `http://${parsed.host}:${parsed.port}`;
		}

		return `http://${parsed.host}:${parsed.port}`;
	}

	if (__DEV__) {
		const fallbackDevServerUrl =
			Platform.OS === "android" ? "http://10.0.2.2:8081" : "http://localhost:8081";

		return getTailscaleDevServerUrl() ?? fallbackDevServerUrl;
	}

	return null;
}

export function getApiUrl(path: string) {
	const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

	if (apiBaseUrl) {
		const parsedApiBaseUrl = getHostAndPort(apiBaseUrl);

		if (parsedApiBaseUrl && isLocalhost(parsedApiBaseUrl.host)) {
			const tailscaleUrl = getTailscaleDevServerUrl(parsedApiBaseUrl.port);

			if (tailscaleUrl) {
				return `${tailscaleUrl}${path}`;
			}
		}

		return `${trimTrailingSlash(apiBaseUrl)}${path}`;
	}

	if (Platform.OS === "web") {
		return path;
	}

	const devServerUrl = getDevServerUrl();

	if (!devServerUrl) {
		throw new Error("Set EXPO_PUBLIC_API_BASE_URL to reach Expo API routes from this build.");
	}

	return `${devServerUrl}${path}`;
}
