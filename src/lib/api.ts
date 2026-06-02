import Constants from "expo-constants";
import { Platform } from "react-native";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

function getHostAndPort(uri?: string | null) {
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
			port: url.port || "8081",
		};
	} catch {
		const [host, port] = uri.split(":");

		if (!host) {
			return null;
		}

		return {
			host,
			port: port || "8081",
		};
	}
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
		return `http://${parsed.host}:${parsed.port}`;
	}

	if (__DEV__) {
		return Platform.OS === "android" ? "http://10.0.2.2:8081" : "http://localhost:8081";
	}

	return null;
}

export function getApiUrl(path: string) {
	const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

	if (apiBaseUrl) {
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
