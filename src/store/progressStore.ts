import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProgressState = {
	hasHydrated: boolean;
	currentXP: number;
	dailyGoalXP: number;
	streakCount: number;
	completedLessonIds: string[];
	setHasHydrated: (hasHydrated: boolean) => void;
	addXP: (amount: number) => void;
	markLessonCompleted: (lessonId: string) => void;
	resetDailyXP: () => void;
};

export const useProgressStore = create<ProgressState>()(
	persist(
		(set) => ({
			hasHydrated: false,
			currentXP: 15,
			dailyGoalXP: 20,
			streakCount: 12,
			completedLessonIds: [],
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			addXP: (amount) =>
				set((state) => ({
					currentXP: Math.min(state.currentXP + amount, state.dailyGoalXP),
				})),
			markLessonCompleted: (lessonId) =>
				set((state) => ({
					completedLessonIds: state.completedLessonIds.includes(lessonId)
						? state.completedLessonIds
						: [...state.completedLessonIds, lessonId],
				})),
			resetDailyXP: () => set({ currentXP: 0 }),
		}),
		{
			name: "progress-storage",
			partialize: (state) => ({
				currentXP: state.currentXP,
				dailyGoalXP: state.dailyGoalXP,
				streakCount: state.streakCount,
				completedLessonIds: state.completedLessonIds,
			}),
			onRehydrateStorage: () => (state, error) => {
				if (state && !error) {
					state.setHasHydrated(true);
					return;
				}
				useProgressStore.getState().setHasHydrated(true);
			},
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
