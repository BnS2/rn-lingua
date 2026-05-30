import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageCode } from "@/types/learning";

type LanguageState = {
	hasHydrated: boolean;
	selectedLanguageCode: LanguageCode | null;
	setHasHydrated: (hasHydrated: boolean) => void;
	setSelectedLanguage: (languageCode: LanguageCode) => void;
	clearSelectedLanguage: () => void;
};

const serverStorage: StateStorage = {
	getItem: () => null,
	setItem: () => undefined,
	removeItem: () => undefined,
};

const getPersistStorage = () => {
	if (typeof window === "undefined") {
		return serverStorage;
	}

	return AsyncStorage;
};

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set) => ({
			hasHydrated: false,
			selectedLanguageCode: null,
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			setSelectedLanguage: (languageCode) => set({ selectedLanguageCode: languageCode }),
			clearSelectedLanguage: () => set({ selectedLanguageCode: null }),
		}),
		{
			name: "language-storage",
			partialize: (state) => ({
				selectedLanguageCode: state.selectedLanguageCode,
			}),
			onRehydrateStorage: () => (state, error) => {
				if (state && !error) {
					state.setHasHydrated(true);
					return;
				}

				useLanguageStore.getState().setHasHydrated(true);
			},
			storage: createJSONStorage(getPersistStorage),
		},
	),
);
