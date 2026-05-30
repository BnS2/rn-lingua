import { useAuth } from "@clerk/expo";
import { useLanguageStore } from "@/store/languageStore";

type AuthGateResult =
	| { status: "loading" }
	| { status: "redirect"; href: "/onboarding" | "/language-selection" }
	| { status: "ready" };

export function useAuthGate(): AuthGateResult {
	const { isLoaded, isSignedIn } = useAuth();
	const { hasHydrated, selectedLanguageCode } = useLanguageStore();

	if (!isLoaded || (isSignedIn && !hasHydrated)) {
		return { status: "loading" };
	}

	if (!isSignedIn) {
		return { status: "redirect", href: "/onboarding" };
	}

	if (!selectedLanguageCode) {
		return { status: "redirect", href: "/language-selection" };
	}

	return { status: "ready" };
}
