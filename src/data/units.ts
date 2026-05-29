import type { LearningUnit } from "@/types/learning";

export const units = [
	{
		id: "es-basics-1",
		languageCode: "es",
		title: "Spanish Basics",
		description: "Greet people, say who you are, and answer simply.",
		order: 1,
		lessonIds: ["es-greetings", "es-introductions"],
	},
	{
		id: "fr-basics-1",
		languageCode: "fr",
		title: "French Basics",
		description: "Build your first polite greetings and introductions.",
		order: 1,
		lessonIds: ["fr-greetings", "fr-introductions"],
	},
	{
		id: "ja-basics-1",
		languageCode: "ja",
		title: "Japanese Basics",
		description: "Practice simple polite greetings for beginners.",
		order: 1,
		lessonIds: ["ja-greetings", "ja-introductions"],
	},
] satisfies LearningUnit[];

export const getUnitsByLanguage = (languageCode: LearningUnit["languageCode"]) =>
	units.filter((unit) => unit.languageCode === languageCode);
