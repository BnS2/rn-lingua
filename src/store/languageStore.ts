import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageCode } from "@/types/learning";

type LanguageState = {
	hasHydrated: boolean;
	selectedLanguageCode: LanguageCode | null;
	selectedLanguageUserId: string | null;
	setHasHydrated: (hasHydrated: boolean) => void;
	setSelectedLanguage: (languageCode: LanguageCode, userId: string) => void;
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
			selectedLanguageUserId: null,
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			setSelectedLanguage: (languageCode, userId) =>
				set({ selectedLanguageCode: languageCode, selectedLanguageUserId: userId }),
			clearSelectedLanguage: () =>
				set({ selectedLanguageCode: null, selectedLanguageUserId: null }),
		}),
		{
			name: "language-storage",
			partialize: (state) => ({
				selectedLanguageCode: state.selectedLanguageCode,
				selectedLanguageUserId: state.selectedLanguageUserId,
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
