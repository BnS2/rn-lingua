import type { SupportedLanguage } from "@/types/learning";

export const languages = [
	{
		code: "es",
		name: "Spanish",
		nativeName: "Español",
		flagUrl: "https://flagcdn.com/w320/es.png",
		accentColor: "#FF9600",
		description: "Start with friendly greetings and everyday phrases.",
	},
	{
		code: "fr",
		name: "French",
		nativeName: "Français",
		flagUrl: "https://flagcdn.com/w320/fr.png",
		accentColor: "#1CB0F6",
		description: "Learn simple introductions for travel and conversation.",
	},
	{
		code: "ja",
		name: "Japanese",
		nativeName: "Nihongo",
		flagUrl: "https://flagcdn.com/w320/jp.png",
		accentColor: "#CE82FF",
		description: "Practice polite beginner phrases with romaji support.",
	},
] satisfies SupportedLanguage[];

export const getLanguageByCode = (code: SupportedLanguage["code"]) =>
	languages.find((language) => language.code === code);
