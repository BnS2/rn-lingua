import type { LearningLesson } from "@/types/learning";

export const lessons = [
	// ── Spanish ──────────────────────────────────────────────────────────────
	{
		id: "es-greetings",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Greetings & Introductions",
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
			"Teach only this Spanish greetings lesson: hola, adios, and Buenos dias. Mostly speak English, say each Spanish phrase slowly with its meaning, listen to the learner, then warmly ask them to repeat or try the greeting again in one or two natural sentences.",
	},
	{
		id: "es-daily-life",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Daily Life",
		description: "Say your name and ask how someone is doing.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "es-daily-goal-1", text: "Describe a typical day in Spanish." },
			{ id: "es-daily-goal-2", text: "Use common daily routine words." },
		],
		vocabulary: [
			{
				id: "es-vocab-desayuno",
				term: "el desayuno",
				translation: "breakfast",
				pronunciation: "el deh-sah-YOO-noh",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "es-phrase-como-te-llamas",
				text: "Como te llamas?",
				translation: "What is your name?",
				pronunciation: "KOH-moh teh YAH-mahs",
				context: "Ask someone's name informally.",
			},
		],
		activities: [
			{
				id: "es-daily-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: What is your name?",
				correctPhrase: "Como te llamas?",
				wordBank: ["llamas", "te", "Como", "estas"],
			},
			{
				id: "es-daily-activity-2",
				kind: "ai-teacher-prompt",
				prompt: "Practice describing your morning with the AI teacher.",
				teacherPrompt:
					"Ask the learner to describe their morning routine with one short Spanish sentence that starts with Por la manana yo.",
				expectedLearnerResponse: "Por la manana yo...",
			},
		],
		aiTeacherPrompt:
			"Teach only this Spanish daily-life lesson: el desayuno, Como te llamas?, and a short morning routine sentence starting with Por la manana yo. Mostly speak English, introduce each Spanish phrase slowly with its meaning, listen to the learner's answer, and gently ask them to describe their morning with one short response.",
	},
	{
		id: "es-at-the-cafe",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "At the Café",
		description: "Order drinks and food at a Spanish café.",
		kind: "phrases",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 6,
		goals: [
			{ id: "es-cafe-goal-1", text: "Order a coffee or tea in Spanish." },
			{ id: "es-cafe-goal-2", text: "Ask for the bill politely." },
		],
		vocabulary: [
			{
				id: "es-vocab-cafe",
				term: "el café",
				translation: "coffee",
				pronunciation: "el kah-FEH",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "es-phrase-un-cafe",
				text: "Un café, por favor",
				translation: "A coffee, please",
				pronunciation: "oon kah-FEH por fah-VOR",
				context: "Order a coffee at a café.",
			},
		],
		activities: [
			{
				id: "es-cafe-activity-1",
				kind: "multiple-choice",
				prompt: "How do you ask for the bill in Spanish?",
				correctAnswer: "La cuenta, por favor",
				options: ["La cuenta, por favor", "Un café", "Buenos dias", "Me llamo"],
			},
		],
		aiTeacherPrompt:
			"Teach only this Spanish café lesson: el café and Un café, por favor. Mostly speak English, model the order slowly with the translation, listen to the learner, and encourage them to repeat or place the order again.",
	},
	{
		id: "es-travel-directions",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Travel & Directions",
		description: "Ask for directions and navigate new places.",
		kind: "listening",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 7,
		goals: [
			{ id: "es-travel-goal-1", text: "Ask where a place is located." },
			{ id: "es-travel-goal-2", text: "Understand simple direction words." },
		],
		vocabulary: [
			{
				id: "es-vocab-izquierda",
				term: "la izquierda",
				translation: "the left",
				pronunciation: "lah ees-KYEH-rdah",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "es-phrase-donde-esta",
				text: "Donde esta el banco?",
				translation: "Where is the bank?",
				pronunciation: "DOHN-deh ehs-TAH el BAHN-koh",
				context: "Ask for a location in the city.",
			},
		],
		activities: [
			{
				id: "es-travel-activity-1",
				kind: "listen-and-repeat",
				prompt: "Listen and repeat the direction phrase.",
				phraseId: "es-phrase-donde-esta",
			},
		],
		aiTeacherPrompt:
			"Teach only this Spanish directions lesson: la izquierda and Donde esta el banco? Mostly speak English, say the Spanish slowly with translations, listen for the learner's attempt, and gently guide them to repeat the direction question.",
	},
	{
		id: "es-shopping",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Shopping",
		description: "Buy things and ask about prices in Spanish.",
		kind: "vocabulary",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "es-shopping-goal-1", text: "Ask how much something costs." },
			{ id: "es-shopping-goal-2", text: "Name common shopping items." },
		],
		vocabulary: [
			{
				id: "es-vocab-cuanto",
				term: "cuanto cuesta",
				translation: "how much does it cost",
				pronunciation: "KWAHN-toh KWEHS-tah",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "es-phrase-cuanto-cuesta",
				text: "Cuanto cuesta esto?",
				translation: "How much does this cost?",
				pronunciation: "KWAHN-toh KWEHS-tah EHS-toh",
				context: "Ask for the price of an item.",
			},
		],
		activities: [
			{
				id: "es-shopping-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this shopping phrase.",
				vocabularyId: "es-vocab-cuanto",
			},
		],
		aiTeacherPrompt:
			"Teach only this Spanish shopping lesson: cuanto cuesta and Cuanto cuesta esto? Mostly speak English, explain the price question slowly with its translation, listen to the learner, and cheerfully ask them to repeat or ask the price again.",
	},
	{
		id: "es-family-friends",
		languageCode: "es",
		unitId: "es-basics-1",
		title: "Family & Friends",
		description: "Talk about your family and people you know.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "es-family-goal-1", text: "Name family members in Spanish." },
			{ id: "es-family-goal-2", text: "Introduce your family simply." },
		],
		vocabulary: [
			{
				id: "es-vocab-familia",
				term: "la familia",
				translation: "the family",
				pronunciation: "lah fah-MEE-lyah",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "es-phrase-mi-familia",
				text: "Esta es mi familia",
				translation: "This is my family",
				pronunciation: "EHS-tah ehs mee fah-MEE-lyah",
				context: "Introduce your family to someone.",
			},
		],
		activities: [
			{
				id: "es-family-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: This is my family.",
				correctPhrase: "Esta es mi familia",
				wordBank: ["familia", "Esta", "mi", "es"],
			},
		],
		aiTeacherPrompt:
			"Teach only this Spanish family lesson: la familia and Esta es mi familia. Mostly speak English, introduce the Spanish words slowly with meanings, listen to the learner, and warmly ask them to repeat or introduce the family phrase again.",
	},

	// ── French ──────────────────────────────────────────────────────────────
	{
		id: "fr-greetings",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Greetings & Introductions",
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
			"Teach only this French greetings lesson: bonjour, salut, and Au revoir. Mostly speak English, say each French phrase slowly with its meaning, listen to the learner, and warmly ask them to repeat or choose the right greeting.",
	},
	{
		id: "fr-daily-life",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Daily Life",
		description: "Say your name and ask a friendly question.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "fr-daily-goal-1", text: "Say my name is in French." },
			{ id: "fr-daily-goal-2", text: "Ask someone how they are." },
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
				id: "fr-daily-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: My name is Lea.",
				correctPhrase: "Je m'appelle Lea",
				wordBank: ["Lea", "Je", "bonjour", "m'appelle"],
			},
			{
				id: "fr-daily-activity-2",
				kind: "listen-and-repeat",
				prompt: "Listen, then repeat the question.",
				phraseId: "fr-phrase-ca-va",
			},
		],
		aiTeacherPrompt:
			"Teach only this French daily-life lesson: je m'appelle, Je m'appelle Lea, and Ca va? Mostly speak English, model the French slowly with translations, listen to the learner, and gently ask them to repeat or answer with their own name.",
	},
	{
		id: "fr-at-the-cafe",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "At the Café",
		description: "Order a coffee and pastry at a Parisian café.",
		kind: "phrases",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 6,
		goals: [
			{ id: "fr-cafe-goal-1", text: "Order a drink at a café in French." },
			{ id: "fr-cafe-goal-2", text: "Ask for the bill politely." },
		],
		vocabulary: [
			{
				id: "fr-vocab-cafe",
				term: "un café",
				translation: "a coffee",
				pronunciation: "uhn kah-FEH",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "fr-phrase-un-cafe-sil",
				text: "Un café, s'il vous plaît",
				translation: "A coffee, please",
				pronunciation: "uhn kah-FEH seel voo PLEH",
				context: "Order a coffee politely.",
			},
		],
		activities: [
			{
				id: "fr-cafe-activity-1",
				kind: "multiple-choice",
				prompt: "How do you say please in French?",
				correctAnswer: "s'il vous plaît",
				options: ["s'il vous plaît", "merci", "au revoir", "bonjour"],
			},
		],
		aiTeacherPrompt:
			"Teach only this French café lesson: un café and Un café, s'il vous plaît. Mostly speak English, say the order slowly with its meaning, listen to the learner, and warmly ask them to repeat or order again.",
	},
	{
		id: "fr-travel-directions",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Travel & Directions",
		description: "Navigate Paris like a local.",
		kind: "listening",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 7,
		goals: [
			{ id: "fr-travel-goal-1", text: "Ask where a place is in French." },
			{ id: "fr-travel-goal-2", text: "Understand left, right, and straight." },
		],
		vocabulary: [
			{
				id: "fr-vocab-gauche",
				term: "à gauche",
				translation: "to the left",
				pronunciation: "ah GOHSH",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "fr-phrase-ou-est",
				text: "Où est la gare?",
				translation: "Where is the train station?",
				pronunciation: "oo eh lah GAHR",
				context: "Ask for directions to the train station.",
			},
		],
		activities: [
			{
				id: "fr-travel-activity-1",
				kind: "listen-and-repeat",
				prompt: "Listen and repeat the direction phrase.",
				phraseId: "fr-phrase-ou-est",
			},
		],
		aiTeacherPrompt:
			"Teach only this French directions lesson: à gauche and Où est la gare? Mostly speak English, introduce the French slowly with translations, listen to the learner's attempt, and gently ask them to repeat the direction question.",
	},
	{
		id: "fr-shopping",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Shopping",
		description: "Shop at a French market or boutique.",
		kind: "vocabulary",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "fr-shopping-goal-1", text: "Ask the price in French." },
			{ id: "fr-shopping-goal-2", text: "Name common market items." },
		],
		vocabulary: [
			{
				id: "fr-vocab-combien",
				term: "combien coûte",
				translation: "how much does it cost",
				pronunciation: "kohm-BYEHN koot",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "fr-phrase-combien",
				text: "Combien coûte ce livre?",
				translation: "How much does this book cost?",
				pronunciation: "kohm-BYEHN koot suh LEE-vruh",
				context: "Ask for the price of an item.",
			},
		],
		activities: [
			{
				id: "fr-shopping-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this shopping phrase.",
				vocabularyId: "fr-vocab-combien",
			},
		],
		aiTeacherPrompt:
			"Teach only this French shopping lesson: combien coûte and Combien coûte ce livre? Mostly speak English, explain the price question slowly with its meaning, listen to the learner, and cheerfully ask them to repeat or ask again.",
	},
	{
		id: "fr-family-friends",
		languageCode: "fr",
		unitId: "fr-basics-1",
		title: "Family & Friends",
		description: "Talk about your family in French.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "fr-family-goal-1", text: "Name family members in French." },
			{ id: "fr-family-goal-2", text: "Introduce your family." },
		],
		vocabulary: [
			{
				id: "fr-vocab-famille",
				term: "la famille",
				translation: "the family",
				pronunciation: "lah fah-MEE",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "fr-phrase-ma-famille",
				text: "Voici ma famille",
				translation: "Here is my family",
				pronunciation: "vwah-SEE mah fah-MEE",
				context: "Introduce your family.",
			},
		],
		activities: [
			{
				id: "fr-family-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: Here is my family.",
				correctPhrase: "Voici ma famille",
				wordBank: ["famille", "Voici", "ma", "mon"],
			},
		],
		aiTeacherPrompt:
			"Teach only this French family lesson: la famille and Voici ma famille. Mostly speak English, say the French slowly with translations, listen to the learner, and warmly ask them to repeat or introduce the family phrase again.",
	},

	// ── Japanese ──────────────────────────────────────────────────────────────
	{
		id: "ja-greetings",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Greetings & Introductions",
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
			"Teach only this Japanese greetings lesson in romaji: konnichiwa, arigato, and ohayo gozaimasu. Mostly speak English, say each word slowly with its meaning, listen to the learner, and warmly ask them to repeat or try the greeting again.",
	},
	{
		id: "ja-daily-life",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Daily Life",
		description: "Practice a simple polite self-introduction.",
		kind: "ai-teacher",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 5,
		goals: [
			{ id: "ja-daily-goal-1", text: "Say nice to meet you politely." },
			{ id: "ja-daily-goal-2", text: "Use a simple name introduction pattern." },
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
				id: "ja-daily-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: I am Emi.",
				correctPhrase: "watashi wa Emi desu",
				wordBank: ["desu", "Emi", "wa", "watashi"],
			},
			{
				id: "ja-daily-activity-2",
				kind: "ai-teacher-prompt",
				prompt: "Practice a polite introduction with the AI teacher.",
				teacherPrompt:
					"Ask the learner to say hajimemashite, then watashi wa followed by a name and desu, using only this romaji introduction pattern.",
				expectedLearnerResponse: "Hajimemashite. Watashi wa ... desu.",
			},
		],
		aiTeacherPrompt:
			"Teach only this Japanese self-introduction lesson in romaji: hajimemashite, watashi wa Emi desu, and yoroshiku onegaishimasu. Mostly speak English, introduce each phrase slowly with its meaning, listen to the learner, and gently ask them to repeat or try with their name.",
	},
	{
		id: "ja-at-the-cafe",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "At the Café",
		description: "Order tea and snacks at a Japanese café.",
		kind: "phrases",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 6,
		goals: [
			{ id: "ja-cafe-goal-1", text: "Order a drink at a Japanese café." },
			{ id: "ja-cafe-goal-2", text: "Say please and thank you when ordering." },
		],
		vocabulary: [
			{
				id: "ja-vocab-ocha",
				term: "ocha",
				translation: "green tea",
				pronunciation: "oh-chah",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "ja-phrase-ocha-kudasai",
				text: "ocha wo kudasai",
				translation: "Green tea, please",
				pronunciation: "oh-chah woh koo-dah-sai",
				context: "Order green tea at a café.",
			},
		],
		activities: [
			{
				id: "ja-cafe-activity-1",
				kind: "multiple-choice",
				prompt: "How do you say please in Japanese when ordering?",
				correctAnswer: "kudasai",
				options: ["kudasai", "arigato", "sumimasen", "hai"],
			},
		],
		aiTeacherPrompt:
			"Teach only this Japanese café lesson in romaji: ocha and ocha wo kudasai. Mostly speak English, say the order slowly with its meaning, listen to the learner, and cheerfully ask them to repeat or order green tea again.",
	},
	{
		id: "ja-travel-directions",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Travel & Directions",
		description: "Get around Japan by asking for directions.",
		kind: "listening",
		level: "A1",
		xpReward: 12,
		estimatedMinutes: 7,
		goals: [
			{ id: "ja-travel-goal-1", text: "Ask where a place is in Japanese." },
			{ id: "ja-travel-goal-2", text: "Understand left, right, and straight ahead." },
		],
		vocabulary: [
			{
				id: "ja-vocab-hidari",
				term: "hidari",
				translation: "left",
				pronunciation: "hee-dah-ree",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "ja-phrase-doko-desu-ka",
				text: "eki wa doko desu ka?",
				translation: "Where is the train station?",
				pronunciation: "eh-kee wah doh-koh dess kah",
				context: "Ask for the location of the train station.",
			},
		],
		activities: [
			{
				id: "ja-travel-activity-1",
				kind: "listen-and-repeat",
				prompt: "Listen and repeat the direction phrase.",
				phraseId: "ja-phrase-doko-desu-ka",
			},
		],
		aiTeacherPrompt:
			"Teach only this Japanese directions lesson in romaji: hidari and eki wa doko desu ka? Mostly speak English, explain the words slowly with translations, listen to the learner, and gently ask them to repeat the direction question.",
	},
	{
		id: "ja-shopping",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Shopping",
		description: "Shop at a Japanese store and ask about prices.",
		kind: "vocabulary",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "ja-shopping-goal-1", text: "Ask how much something costs in Japanese." },
			{ id: "ja-shopping-goal-2", text: "Understand basic price responses." },
		],
		vocabulary: [
			{
				id: "ja-vocab-ikura",
				term: "ikura desu ka",
				translation: "how much is it",
				pronunciation: "ee-koo-rah dess kah",
				partOfSpeech: "phrase",
			},
		],
		phrases: [
			{
				id: "ja-phrase-ikura",
				text: "Kore wa ikura desu ka?",
				translation: "How much is this?",
				pronunciation: "koh-reh wah ee-koo-rah dess kah",
				context: "Ask for the price of an item.",
			},
		],
		activities: [
			{
				id: "ja-shopping-activity-1",
				kind: "vocabulary-card",
				prompt: "Review this shopping phrase.",
				vocabularyId: "ja-vocab-ikura",
			},
		],
		aiTeacherPrompt:
			"Teach only this Japanese shopping lesson in romaji: ikura desu ka and Kore wa ikura desu ka? Mostly speak English, say the price question slowly with its meaning, listen to the learner, and warmly ask them to repeat or ask again.",
	},
	{
		id: "ja-family-friends",
		languageCode: "ja",
		unitId: "ja-basics-1",
		title: "Family & Friends",
		description: "Talk about your family in Japanese.",
		kind: "phrases",
		level: "A1",
		xpReward: 10,
		estimatedMinutes: 5,
		goals: [
			{ id: "ja-family-goal-1", text: "Name family members in Japanese." },
			{ id: "ja-family-goal-2", text: "Describe your family simply." },
		],
		vocabulary: [
			{
				id: "ja-vocab-kazoku",
				term: "kazoku",
				translation: "family",
				pronunciation: "kah-zoh-koo",
				partOfSpeech: "noun",
			},
		],
		phrases: [
			{
				id: "ja-phrase-watashi-no-kazoku",
				text: "watashi no kazoku desu",
				translation: "This is my family",
				pronunciation: "wah-tah-shee noh kah-zoh-koo dess",
				context: "Introduce your family.",
			},
		],
		activities: [
			{
				id: "ja-family-activity-1",
				kind: "phrase-builder",
				prompt: "Build the phrase: This is my family.",
				correctPhrase: "watashi no kazoku desu",
				wordBank: ["desu", "kazoku", "watashi", "no"],
			},
		],
		aiTeacherPrompt:
			"Teach only this Japanese family lesson in romaji: kazoku and watashi no kazoku desu. Mostly speak English, introduce the words slowly with translations, listen to the learner, and gently ask them to repeat or introduce the family phrase again.",
	},
] satisfies LearningLesson[];

export const getLessonsByLanguage = (languageCode: LearningLesson["languageCode"]) =>
	lessons.filter((lesson) => lesson.languageCode === languageCode);

export const getLessonsByUnit = (unitId: LearningLesson["unitId"]) =>
	lessons.filter((lesson) => lesson.unitId === unitId);

export const getLessonById = (id: LearningLesson["id"]) =>
	lessons.find((lesson) => lesson.id === id);
