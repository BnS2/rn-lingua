import type { LanguageCode, LessonGoal, PhraseItem, VocabularyItem } from "@/types/learning";

export type StreamAudioCallRequest = {
	lessonId: string;
	lessonTitle: string;
	lessonDescription: string;
	languageCode: LanguageCode;
	languageName: string;
	goals: LessonGoal[];
	vocabulary: VocabularyItem[];
	phrases: PhraseItem[];
	aiTeacherPrompt: string;
	userName: string;
	userImage?: string;
};

export type StreamAudioCallSession = {
	apiKey: string;
	callId: string;
	callType: "audio_room";
	token: string;
	userId: string;
	userName: string;
	userImage?: string;
	lessonId: string;
	lessonTitle: string;
	languageCode: LanguageCode;
	languageName: string;
};
