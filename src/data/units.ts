import type { LearningUnit } from "@/types/learning";

export const units = [
	{
		id: "es-basics-1",
		languageCode: "es",
		title: "Spanish Basics",
		description: "Greet people, say who you are, and answer simply.",
		order: 1,
		lessonIds: [
			"es-greetings",
			"es-daily-life",
			"es-at-the-cafe",
			"es-travel-directions",
			"es-shopping",
			"es-family-friends",
		],
	},
	{
		id: "fr-basics-1",
		languageCode: "fr",
		title: "French Basics",
		description: "Build your first polite greetings and introductions.",
		order: 1,
		lessonIds: [
			"fr-greetings",
			"fr-daily-life",
			"fr-at-the-cafe",
			"fr-travel-directions",
			"fr-shopping",
			"fr-family-friends",
		],
	},
	{
		id: "ja-basics-1",
		languageCode: "ja",
		title: "Japanese Basics",
		description: "Practice simple polite greetings for beginners.",
		order: 1,
		lessonIds: [
			"ja-greetings",
			"ja-daily-life",
			"ja-at-the-cafe",
			"ja-travel-directions",
			"ja-shopping",
			"ja-family-friends",
		],
	},
] satisfies LearningUnit[];

export const getUnitsByLanguage = (languageCode: LearningUnit["languageCode"]) =>
	units.filter((unit) => unit.languageCode === languageCode);
