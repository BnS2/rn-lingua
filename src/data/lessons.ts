import type { LearningLesson } from "@/types/learning";

export const lessons = [
	{
		id: "es-greetings",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Say Hello",
		description: "Learn warm greetings you can use right away.",
		kind: "vocabulary",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 4,
		goals: [
			{ id: "es-greetings-goal-1", text: "Recognize common Spanish greetings." },
			{ id: "es-greetings-goal-2", text: "Say hello and goodbye politely." },
		],
		vocabulary: [
			{
				id: "es-vocab-hola",
				term: "hola",
				translation: "hello",
				pronunciation: "OH-lah",
				partOfSpeech: "phrase",
				example: "Hola, Sofia.",
			},
			{
				id: "es-vocab-adios",
				term: "adios",
				translation: "goodbye",
				pronunciation: "ah-DYOS",
				partOfSpeech: "phrase",
				example: "Adios, Mateo.",
			},
		],
		phrases: [
			{
				id: "es-phrase-buenos-dias",
				text: "Buenos dias",
				translation: "Good morning",
				pronunciation: "BWEH-nos DEE-ahs",
				context: "Use this greeting in the morning.",
			},
		],
		activities: [
			{
				id: "es-greetings-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this greeting.",
				vocabularyId: "es-vocab-hola",
			},
			{
				id: "es-greetings-activity-2",
				kind: "multiple-choice",
				prompt: "What does hola mean?",
				correctAnswer: "hello",
				options: ["hello", "thank you", "please", "water"],
			},
			{
				id: "es-greetings-activity-3",
				kind: "listen-and-repeat",
				prompt: "Listen, then repeat the morning greeting.",
				phraseId: "es-phrase-buenos-dias",
			},
		],
		aiTeacherPrompt:
			"You are a friendly Spanish teacher. Teach the learner to say hola, adios, and Buenos dias. Speak slowly, ask them to repeat each phrase, and give short encouraging feedback.",
	},
	{
		id: "es-introductions",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Introduce Yourself",
		description: "Say your name and ask how someone is doing.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "es-intro-goal-1", text: "Say your name in Spanish." },
			{ id: "es-intro-goal-2", text: "Ask a simple how-are-you question." },
		],
		vocabulary: [
			{
				id: "es-vocab-me-llamo",
				term: "me llamo",
				translation: "my name is",
				pronunciation: "meh YAH-moh",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "es-phrase-me-llamo-ana",
				text: "Me llamo Ana",
				translation: "My name is Ana",
				pronunciation: "meh YAH-moh AH-nah",
				context: "Use this to introduce yourself.",
			},
			{
				id: "es-phrase-como-estas",
				text: "Como estas?",
				translation: "How are you?",
				pronunciation: "KOH-moh ehs-TAHS",
				context: "Use this with someone your age or someone you know.",
			},
		],
		activities: [
			{
				id: "es-intro-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: My name is Ana.",
				correctPhrase: "Me llamo Ana",
				wordBank: ["Ana", "llamo", "Me", "Hola"],
			},
			{
				id: "es-intro-activity-2",
				kind: "ai-teacher-prompt",
				prompt: "Practice introducing yourself with the AI teacher.",
				teacherPrompt:
					"Ask the learner to say Me llamo followed by their name. Model the phrase once, then pause for their answer.",
				expectedLearnerResponse: "Me llamo ...",
			},
		],
		aiTeacherPrompt:
			"You are a patient Spanish conversation coach. Help the learner introduce themself with Me llamo and ask Como estas? Keep the exchange under one minute and correct only one pronunciation point at a time.",
	},
	{
		id: "fr-greetings",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Say Hello",
		description: "Practice simple French greetings and goodbyes.",
		kind: "vocabulary",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 4,
		goals: [
			{ id: "fr-greetings-goal-1", text: "Recognize bonjour and salut." },
			{ id: "fr-greetings-goal-2", text: "Choose the right greeting for a friendly moment." },
		],
		vocabulary: [
			{
				id: "fr-vocab-bonjour",
				term: "bonjour",
				translation: "hello",
				pronunciation: "bohn-ZHOOR",
				partOfSpeech: "phrase",
			},
			{
				id: "fr-vocab-salut",
				term: "salut",
				translation: "hi",
				pronunciation: "sah-LU",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "fr-phrase-au-revoir",
				text: "Au revoir",
				translation: "Goodbye",
				pronunciation: "oh ruh-VWAHR",
				context: "Use this when leaving.",
			},
		],
		activities: [
			{
				id: "fr-greetings-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this French greeting.",
				vocabularyId: "fr-vocab-bonjour",
			},
			{
				id: "fr-greetings-activity-2",
				kind: "multiple-choice",
				prompt: "What does salut mean?",
				correctAnswer: "hi",
				options: ["hi", "good night", "my name is", "please"],
			},
		],
		aiTeacherPrompt:
			"You are a warm French teacher. Teach bonjour, salut, and Au revoir with clear pronunciation. Ask the learner to repeat, then choose one greeting for a casual friend.",
	},
	{
		id: "fr-introductions",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Introduce Yourself",
		description: "Say your name and ask a friendly question.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "fr-intro-goal-1", text: "Say my name is in French." },
			{ id: "fr-intro-goal-2", text: "Ask someone how they are." },
		],
		vocabulary: [
			{
				id: "fr-vocab-je-mappelle",
				term: "je m'appelle",
				translation: "my name is",
				pronunciation: "zhuh mah-PELL",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "fr-phrase-je-mappelle-lea",
				text: "Je m'appelle Lea",
				translation: "My name is Lea",
				pronunciation: "zhuh mah-PELL LAY-ah",
				context: "Use this to introduce yourself.",
			},
			{
				id: "fr-phrase-ca-va",
				text: "Ca va?",
				translation: "How are you?",
				pronunciation: "sah vah",
				context: "A short friendly question.",
			},
		],
		activities: [
			{
				id: "fr-intro-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: My name is Lea.",
				correctPhrase: "Je m'appelle Lea",
				wordBank: ["Lea", "Je", "bonjour", "m'appelle"],
			},
			{
				id: "fr-intro-activity-2",
				kind: "listen-and-repeat",
				prompt: "Listen, then repeat the question.",
				phraseId: "fr-phrase-ca-va",
			},
		],
		aiTeacherPrompt:
			"You are a gentle French tutor. Coach the learner through Je m'appelle and Ca va? Keep responses simple, model the rhythm, and invite them to answer with their own name.",
	},
	{
		id: "ja-greetings",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Say Hello",
		description: "Learn polite Japanese greetings with romaji support.",
		kind: "listening",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 4,
		goals: [
			{ id: "ja-greetings-goal-1", text: "Recognize common polite greetings." },
			{ id: "ja-greetings-goal-2", text: "Repeat greetings with steady rhythm." },
		],
		vocabulary: [
			{
				id: "ja-vocab-konnichiwa",
				term: "konnichiwa",
				translation: "hello",
				pronunciation: "kohn-nee-chee-wah",
				partOfSpeech: "phrase",
			},
			{
				id: "ja-vocab-arigato",
				term: "arigato",
				translation: "thank you",
				pronunciation: "ah-ree-gah-toh",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "ja-phrase-ohayo",
				text: "ohayo gozaimasu",
				translation: "good morning",
				pronunciation: "oh-hah-yoh goh-zai-mahss",
				context: "Use this polite greeting in the morning.",
			},
		],
		activities: [
			{
				id: "ja-greetings-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this Japanese greeting.",
				vocabularyId: "ja-vocab-konnichiwa",
			},
			{
				id: "ja-greetings-activity-2",
				kind: "listen-and-repeat",
				prompt: "Listen, then repeat the morning greeting.",
				phraseId: "ja-phrase-ohayo",
			},
		],
		aiTeacherPrompt:
			"You are a calm Japanese teacher. Teach konnichiwa, arigato, and ohayo gozaimasu using romaji. Speak slowly, clap the rhythm if helpful, and encourage the learner to repeat each phrase.",
	},
	{
		id: "ja-introductions",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Introduce Yourself",
		description: "Practice a simple polite self-introduction.",
		kind: "ai-teacher",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 5,
		goals: [
			{ id: "ja-intro-goal-1", text: "Say nice to meet you politely." },
			{ id: "ja-intro-goal-2", text: "Use a simple name introduction pattern." },
		],
		vocabulary: [
			{
				id: "ja-vocab-hajimemashite",
				term: "hajimemashite",
				translation: "nice to meet you",
				pronunciation: "hah-jee-meh-mah-shee-teh",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "ja-phrase-watashi-wa-emi",
				text: "watashi wa Emi desu",
				translation: "I am Emi",
				pronunciation: "wah-tah-shee wah EH-mee dess",
				context: "A simple beginner self-introduction.",
			},
			{
				id: "ja-phrase-yoroshiku",
				text: "yoroshiku onegaishimasu",
				translation: "please treat me well",
				pronunciation: "yoh-roh-shee-koo oh-neh-gai-shee-mahss",
				context: "A polite closing for introductions.",
			},
		],
		activities: [
			{
				id: "ja-intro-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: I am Emi.",
				correctPhrase: "watashi wa Emi desu",
				wordBank: ["desu", "Emi", "wa", "watashi"],
			},
			{
				id: "ja-intro-activity-2",
				kind: "ai-teacher-prompt",
				prompt: "Practice a polite introduction with the AI teacher.",
				teacherPrompt:
					"Ask the learner to say hajimemashite, then watashi wa followed by a name and desu. Keep the practice in romaji.",
				expectedLearnerResponse: "Hajimemashite. Watashi wa ... desu.",
			},
		],
		aiTeacherPrompt:
			"You are a supportive Japanese tutor. Guide the learner through a short self-introduction in romaji: hajimemashite, watashi wa [name] desu, yoroshiku onegaishimasu. Keep corrections brief and positive.",
	},
] satisfies LearningLesson[];

export const getLessonsByLanguage = (languageCode: LearningLesson["languageCode"]) =>
	lessons.filter((lesson) => lesson.languageCode === languageCode);

export const getLessonsByUnit = (unitId: LearningLesson["unitId"]) =>
	lessons.filter((lesson) => lesson.unitId === unitId);

export const getLessonById = (id: LearningLesson["id"]) =>
	lessons.find((lesson) => lesson.id === id);
