export type LanguageCode = "es" | "fr" | "ja";

export type LessonKind = "vocabulary" | "phrases" | "listening" | "ai-teacher";

export type ActivityKind =
	| "vocabulary-card"
	| "multiple-choice"
	| "phrase-builder"
	| "listen-and-repeat"
	| "ai-teacher-prompt";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type SupportedLanguage = {
	code: LanguageCode;
	name: string;
	nativeName: string;
	flagEmoji: string;
	accentColor: string;
	description: string;
};

export type VocabularyItem = {
	id: string;
	term: string;
	translation: string;
	pronunciation: string;
	partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase";
	example?: string;
};

export type PhraseItem = {
	id: string;
	text: string;
	translation: string;
	pronunciation: string;
	context: string;
};

export type LessonGoal = {
	id: string;
	text: string;
};

export type BaseActivity = {
	id: string;
	kind: ActivityKind;
	prompt: string;
};

export type VocabularyCardActivity = BaseActivity & {
	kind: "vocabulary-card";
	vocabularyId: string;
};

export type MultipleChoiceActivity = BaseActivity & {
	kind: "multiple-choice";
	correctAnswer: string;
	options: string[];
};

export type PhraseBuilderActivity = BaseActivity & {
	kind: "phrase-builder";
	correctPhrase: string;
	wordBank: string[];
};

export type ListenAndRepeatActivity = BaseActivity & {
	kind: "listen-and-repeat";
	phraseId: string;
};

export type AITeacherPromptActivity = BaseActivity & {
	kind: "ai-teacher-prompt";
	teacherPrompt: string;
	expectedLearnerResponse: string;
};

export type LessonActivity =
	| VocabularyCardActivity
	| MultipleChoiceActivity
	| PhraseBuilderActivity
	| ListenAndRepeatActivity
	| AITeacherPromptActivity;

export type LearningLesson = {
	id: string;
	languageCode: LanguageCode;
	unitId: string;
	title: string;
	description: string;
	kind: LessonKind;
	level: CEFRLevel;
	xpReward: number;
	estimatedMinutes: number;
	goals: LessonGoal[];
	vocabulary: VocabularyItem[];
	phrases: PhraseItem[];
	activities: LessonActivity[];
	aiTeacherPrompt: string;
};

export type LearningUnit = {
	id: string;
	languageCode: LanguageCode;
	title: string;
	description: string;
	order: number;
	lessonIds: string[];
};
