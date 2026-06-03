import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguageCode, LessonReview } from "@/types/learning";

export type LanguageProgress = {
	currentXP: number;
	dailyGoalXP: number;
	streakCount: number;
	completedLessonIds: string[];
	completedLessonsById: Record<
		string,
		{ completedAt: string; xpEarned: number; review?: LessonReview }
	>;
};

type ProgressState = {
	hasHydrated: boolean;
	progressByLanguage: Partial<Record<LanguageCode, LanguageProgress>>;
	setHasHydrated: (hasHydrated: boolean) => void;
	getProgressForLanguage: (languageCode: LanguageCode) => LanguageProgress;
	addXP: (languageCode: LanguageCode, amount: number) => void;
	markLessonCompleted: (
		languageCode: LanguageCode,
		lessonId: string,
		xpReward?: number,
		review?: LessonReview,
	) => void;
	resetDailyXP: (languageCode: LanguageCode) => void;
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

const defaultLanguageProgress: LanguageProgress = {
	currentXP: 0,
	dailyGoalXP: 20,
	streakCount: 0,
	completedLessonIds: [],
	completedLessonsById: {},
};

const emptyLanguageProgress: LanguageProgress = {
	currentXP: 0,
	dailyGoalXP: 20,
	streakCount: 0,
	completedLessonIds: [],
	completedLessonsById: {},
};

const getDefaultLanguageProgress = (): LanguageProgress => ({
	...defaultLanguageProgress,
	completedLessonIds: [],
	completedLessonsById: {},
});

const getNextProgressByLanguage = (
	progressByLanguage: Partial<Record<LanguageCode, LanguageProgress>>,
	languageCode: LanguageCode,
	updateProgress: (progress: LanguageProgress) => LanguageProgress,
) => {
	const currentProgress = progressByLanguage[languageCode] ?? getDefaultLanguageProgress();

	return {
		...progressByLanguage,
		[languageCode]: updateProgress(currentProgress),
	};
};

const migrateProgressStorage = (
	persistedState: unknown,
	persistedVersion: number,
): Partial<ProgressState> => {
	if (!persistedState || typeof persistedState !== "object") {
		return {};
	}

	const state = persistedState as Partial<ProgressState> & Partial<LanguageProgress>;

	if (state.progressByLanguage) {
		return state;
	}

	return {
		progressByLanguage: {
			es: {
				currentXP:
					typeof state.currentXP === "number" ? state.currentXP : defaultLanguageProgress.currentXP,
				dailyGoalXP:
					typeof state.dailyGoalXP === "number"
						? state.dailyGoalXP
						: defaultLanguageProgress.dailyGoalXP,
				streakCount:
					typeof state.streakCount === "number"
						? state.streakCount
						: defaultLanguageProgress.streakCount,
				completedLessonIds: Array.isArray(state.completedLessonIds) ? state.completedLessonIds : [],
				completedLessonsById:
					state.completedLessonsById && typeof state.completedLessonsById === "object"
						? state.completedLessonsById
						: {},
			},
		},
	};
};

export const useProgressStore = create<ProgressState>()(
	persist(
		(set, get) => ({
			hasHydrated: false,
			progressByLanguage: {},
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			getProgressForLanguage: (languageCode) =>
				get().progressByLanguage[languageCode] ?? emptyLanguageProgress,
			addXP: (languageCode, amount) =>
				set((state) => ({
					progressByLanguage: getNextProgressByLanguage(
						state.progressByLanguage,
						languageCode,
						(progress) => ({
							...progress,
							currentXP: Math.min(progress.currentXP + amount, progress.dailyGoalXP),
						}),
					),
				})),
			markLessonCompleted: (languageCode, lessonId, xpReward = 0, review) =>
				set((state) => {
					const currentProgress =
						state.progressByLanguage[languageCode] ?? getDefaultLanguageProgress();

					if (currentProgress.completedLessonIds.includes(lessonId)) {
						if (!review) {
							return state;
						}

						const completedLesson = currentProgress.completedLessonsById[lessonId];

						return {
							progressByLanguage: {
								...state.progressByLanguage,
								[languageCode]: {
									...currentProgress,
									completedLessonsById: {
										...currentProgress.completedLessonsById,
										[lessonId]: {
											completedAt: completedLesson?.completedAt ?? new Date().toISOString(),
											xpEarned: completedLesson?.xpEarned ?? 0,
											review,
										},
									},
								},
							},
						};
					}

					return {
						progressByLanguage: {
							...state.progressByLanguage,
							[languageCode]: {
								...currentProgress,
								currentXP: Math.min(
									currentProgress.currentXP + xpReward,
									currentProgress.dailyGoalXP,
								),
								completedLessonIds: [...currentProgress.completedLessonIds, lessonId],
								completedLessonsById: {
									...currentProgress.completedLessonsById,
									[lessonId]: {
										completedAt: new Date().toISOString(),
										xpEarned: xpReward,
										review,
									},
								},
							},
						},
					};
				}),
			resetDailyXP: (languageCode) =>
				set((state) => ({
					progressByLanguage: getNextProgressByLanguage(
						state.progressByLanguage,
						languageCode,
						(progress) => ({ ...progress, currentXP: 0 }),
					),
				})),
		}),
		{
			name: "progress-storage",
			version: 2,
			migrate: migrateProgressStorage,
			partialize: (state) => ({
				progressByLanguage: state.progressByLanguage,
			}),
			onRehydrateStorage: () => (state, error) => {
				if (state && !error) {
					state.setHasHydrated(true);
					return;
				}
				useProgressStore.getState().setHasHydrated(true);
			},
			storage: createJSONStorage(getPersistStorage),
		},
	),
);
