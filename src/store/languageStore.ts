import { useSyncExternalStore } from "react";
import type { LanguageCode } from "@/types/learning";

let selectedLanguageCode: LanguageCode = "es";
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
};

const getSelectedLanguageCode = () => selectedLanguageCode;

const setSelectedLanguage = (languageCode: LanguageCode) => {
	selectedLanguageCode = languageCode;
	listeners.forEach((listener) => listener());
};

export const useLanguageStore = () => {
	const currentSelectedLanguageCode = useSyncExternalStore(
		subscribe,
		getSelectedLanguageCode,
		getSelectedLanguageCode,
	);

	return {
		selectedLanguageCode: currentSelectedLanguageCode,
		setSelectedLanguage,
	};
};
