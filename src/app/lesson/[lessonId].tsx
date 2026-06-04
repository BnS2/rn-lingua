import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import type {
	Call,
	CallClosedCaption,
	CustomVideoEvent,
	StreamVideoClient,
	TokenProvider,
	User,
} from "@stream-io/video-react-native-sdk";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { getLessonArtworkSource } from "@/constants/lesson-artwork";
import { sounds } from "@/constants/sounds";
import { getLanguageByCode } from "@/data/languages";
import { getLessonById } from "@/data/lessons";
import { getApiUrl } from "@/lib/api";
import { useLanguageStore } from "@/store/languageStore";
import { useProgressStore } from "@/store/progressStore";
import type { LessonReview, PhraseItem, VocabularyItem } from "@/types/learning";
import type { StreamAudioCallSession } from "@/types/stream";

type TabButton = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	activeIcon: keyof typeof Ionicons.glyphMap;
	href:
		| "/(tabs)/home"
		| "/(tabs)/learn"
		| "/(tabs)/ai-teacher"
		| "/(tabs)/chat"
		| "/(tabs)/profile";
};

type CallStatus = "idle" | "creating" | "connecting" | "joined" | "ended" | "error";
type AgentConnectionStatus = "idle" | "connecting" | "connected" | "failed";
type CaptionSpeakerKind = "teacher" | "learner" | "guest";
type LiveCaption = CallClosedCaption & {
	speakerKind: CaptionSpeakerKind;
	speakerLabel: string;
};
type CaptionStatus = "started" | "ended" | "transcript";
type CaptionRow = {
	id: string;
	speakerKind: CaptionSpeakerKind;
	speakerLabel: string;
	text: string;
	isInterim: boolean;
};
type TeacherTargetItem = PhraseItem | VocabularyItem;
type TargetAttemptCounts = Record<string, number>;
type AudioLessonTargetEvent = {
	targetItemId: string;
	targetIndex: number;
	targetCount: number;
	reason?: string;
};

type VisionAgentSession = {
	session_id: string;
	call_id: string;
	session_started_at: string;
};

const tabs: TabButton[] = [
	{ label: "Home", icon: "home-outline", activeIcon: "home", href: "/(tabs)/home" },
	{ label: "Learn", icon: "book-outline", activeIcon: "book", href: "/(tabs)/learn" },
	{
		label: "AI Teacher",
		icon: "school-outline",
		activeIcon: "school-outline",
		href: "/(tabs)/ai-teacher",
	},
	{ label: "Chat", icon: "chatbubble-outline", activeIcon: "chatbubble", href: "/(tabs)/chat" },
	{ label: "Profile", icon: "person-outline", activeIcon: "person", href: "/(tabs)/profile" },
];

const fallbackLessonReview: LessonReview = {
	ratings: {
		speaking: "Try again",
		pronunciation: "0 items",
		grammar: "Speak aloud",
	},
	comments: [
		"No spoken attempt was captured before the lesson ended.",
		"Try again and repeat each lesson item out loud.",
	],
};

const emptyCompletedLessonIds: string[] = [];
const teacherResponseTimeoutMs = 10_000;
const audioPermissionHydrationTimeoutMs = 4_000;
const pushToTalkReleaseTailMs = 900;
const finalFeedbackFallbackMs = 6_000;
const learnerListeningCaption = "Listening to you...";
const callingStateLeft = "left";
const lessonPlaybackAudioMode = {
	playsInSilentMode: true,
	interruptionMode: "mixWithOthers",
	allowsRecording: false,
	shouldRouteThroughEarpiece: false,
} as const;
const webRtcUnavailableMessage =
	"Live audio lessons use Stream WebRTC, which is not included in Expo Go. Run this app in a development build with `npm run ios` or `npm run android`.";

let streamVideoSdkPromise: Promise<typeof import("@stream-io/video-react-native-sdk")> | undefined;

function loadStreamVideoSdk() {
	streamVideoSdkPromise ??= import("@stream-io/video-react-native-sdk");
	return streamVideoSdkPromise;
}

function getStreamVideoErrorMessage(error: unknown) {
	const message = error instanceof Error ? error.message : "";

	if (message.toLowerCase().includes("webrtc") || message.toLowerCase().includes("native module")) {
		return webRtcUnavailableMessage;
	}

	return error instanceof Error ? error.message : "Unable to join the audio lesson.";
}

function restoreLessonPlaybackAudioMode() {
	return setAudioModeAsync(lessonPlaybackAudioMode);
}

function normalizeLessonSpeechText(text: string) {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function compactLessonSpeechText(text: string) {
	return normalizeLessonSpeechText(text).replace(/\s+/g, "");
}

function getSpeechMatchTerms(text: string) {
	const normalizedText = normalizeLessonSpeechText(text);
	const compactText = compactLessonSpeechText(text);
	const noSilentHText = compactText.replaceAll("h", "");
	const softVText = noSilentHText.replaceAll("v", "b");

	return [normalizedText, compactText, noSilentHText, softVText].filter(
		(term, index, terms) => term.length > 0 && terms.indexOf(term) === index,
	);
}

function getTargetItemTerms(item: TeacherTargetItem) {
	const originalText = "term" in item ? item.term : item.text;
	const baseText = originalText.split(" ");
	const withoutShortArticle =
		baseText.length > 1 && baseText[0].length <= 3 ? baseText.slice(1).join(" ") : originalText;

	return [originalText, withoutShortArticle, item.pronunciation, item.translation]
		.flatMap(getSpeechMatchTerms)
		.filter((term, index, terms) => terms.indexOf(term) === index);
}

function findTeacherTargetItem(
	spokenText: string,
	items: TeacherTargetItem[],
): TeacherTargetItem | null {
	const speechNormalized = normalizeLessonSpeechText(spokenText);

	if (!speechNormalized) {
		return null;
	}

	const speechCompact = compactLessonSpeechText(spokenText);
	let bestMatch: TeacherTargetItem | null = null;
	let highestIndex = -1;

	for (const item of items) {
		for (const term of getTargetItemTerms(item)) {
			const index = term.includes(" ")
				? speechNormalized.lastIndexOf(term)
				: speechCompact.lastIndexOf(term);

			if (index > highestIndex) {
				highestIndex = index;
				bestMatch = item;
			}
		}
	}

	return bestMatch;
}

function getTargetItemIndex(spokenText: string, items: TeacherTargetItem[]) {
	const targetItem = findTeacherTargetItem(spokenText, items);

	if (!targetItem) {
		return -1;
	}

	return items.findIndex(
		(item) => getTeacherTargetItemId(item) === getTeacherTargetItemId(targetItem),
	);
}

function getCaptionSpeakerKind(caption: CallClosedCaption, currentUserId?: string | null) {
	if (caption.speaker_id === "ai-language-teacher" || caption.user.id === "ai-language-teacher") {
		return "teacher";
	}

	if (caption.speaker_id === currentUserId || caption.user.id === currentUserId) {
		return "learner";
	}

	return "guest";
}

function toLiveCaption(caption: CallClosedCaption, currentUserId?: string | null): LiveCaption {
	const speakerKind = getCaptionSpeakerKind(caption, currentUserId);
	const fallbackName = caption.user.name || caption.speaker_id;
	const speakerLabel =
		speakerKind === "teacher" ? "AI Teacher" : speakerKind === "learner" ? "You" : fallbackName;

	return {
		...caption,
		speakerKind,
		speakerLabel,
	};
}

function getCaptionSpeakerLabel(speakerKind: CaptionSpeakerKind) {
	return speakerKind === "teacher" ? "AI Teacher" : speakerKind === "learner" ? "You" : "Guest";
}

function getInterimCaptionText(speakerKind: CaptionSpeakerKind) {
	return speakerKind === "teacher"
		? "AI Teacher is speaking..."
		: speakerKind === "learner"
			? "Listening to you..."
			: "Listening...";
}

function isCaptionSpeakerKind(value: unknown): value is CaptionSpeakerKind {
	return value === "teacher" || value === "learner" || value === "guest";
}

function isCaptionStatus(value: unknown): value is CaptionStatus {
	return value === "started" || value === "ended" || value === "transcript";
}

function parseNumericEventValue(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) ? numericValue : null;
	}

	return null;
}

function parseAudioLessonCaptionEvent(event: CustomVideoEvent) {
	const custom = event.custom;

	if (custom.kind !== "audio_lesson_caption_status") {
		return null;
	}

	if (!isCaptionSpeakerKind(custom.speaker) || !isCaptionStatus(custom.status)) {
		return null;
	}

	return {
		speakerKind: custom.speaker,
		status: custom.status,
		text: typeof custom.text === "string" ? custom.text : undefined,
	};
}

function parseAudioLessonFinishReviewEvent(event: CustomVideoEvent): LessonReview | null {
	const custom = event.custom;

	if (custom.kind !== "audio_lesson_completed" && custom.kind !== "audio_lesson_ready_to_finish") {
		return null;
	}

	const ratings = custom.ratings;
	const comments = custom.comments;

	return {
		ratings: {
			speaking:
				typeof ratings === "object" &&
				ratings !== null &&
				"speaking" in ratings &&
				typeof ratings.speaking === "string"
					? ratings.speaking
					: "Try again",
			pronunciation:
				typeof ratings === "object" &&
				ratings !== null &&
				"pronunciation" in ratings &&
				typeof ratings.pronunciation === "string"
					? ratings.pronunciation
					: "0 items",
			grammar:
				typeof ratings === "object" &&
				ratings !== null &&
				"grammar" in ratings &&
				typeof ratings.grammar === "string"
					? ratings.grammar
					: "Speak aloud",
		},
		comments: Array.isArray(comments)
			? comments.filter((comment): comment is string => typeof comment === "string").slice(0, 2)
			: fallbackLessonReview.comments,
	};
}

function parseAudioLessonTargetEvent(event: CustomVideoEvent): AudioLessonTargetEvent | null {
	const custom = event.custom;
	const targetIndex = parseNumericEventValue(custom.targetIndex);
	const targetCount = parseNumericEventValue(custom.targetCount);

	if (custom.kind !== "audio_lesson_target") {
		return null;
	}

	if (typeof custom.targetItemId !== "string" || targetIndex === null || targetCount === null) {
		return null;
	}

	return {
		targetItemId: custom.targetItemId,
		targetIndex,
		targetCount,
		reason: typeof custom.reason === "string" ? custom.reason : undefined,
	};
}

function getCompletedTargetCountFromReview(review: LessonReview) {
	const match = review.ratings.pronunciation.match(/^(\d+)\/(\d+)/);

	if (!match) {
		return null;
	}

	const completedTargetCount = Number(match[1]);

	return Number.isFinite(completedTargetCount) ? completedTargetCount : null;
}

function formatLessonTextForReading(text: string, pronunciation?: string) {
	if (!pronunciation || pronunciation.trim().toLowerCase() === text.trim().toLowerCase()) {
		return text;
	}

	return `${pronunciation} (${text})`;
}

function getTeacherTargetItemId(item: TeacherTargetItem) {
	return item.id;
}

function buildHonestLessonReview(
	learnerAttemptCount: number,
	completedTargetCount: number,
	targetCount: number,
): LessonReview {
	const coveredTargetCount = targetCount > 0 ? Math.min(completedTargetCount, targetCount) : 0;
	const reviewAttemptCount = Math.max(learnerAttemptCount, coveredTargetCount);
	const attemptedEveryTarget = targetCount > 0 && coveredTargetCount >= targetCount;
	const spokeEnoughForPractice =
		reviewAttemptCount >= Math.max(1, Math.min(targetCount || 1, coveredTargetCount || 1));

	if (reviewAttemptCount === 0) {
		return fallbackLessonReview;
	}

	return {
		ratings: {
			speaking: `${reviewAttemptCount} attempt${reviewAttemptCount === 1 ? "" : "s"}`,
			pronunciation: `${coveredTargetCount}/${targetCount || 1} items`,
			grammar: attemptedEveryTarget
				? "Review anytime"
				: spokeEnoughForPractice
					? "Keep practicing"
					: "Repeat aloud",
		},
		comments: [
			attemptedEveryTarget
				? `You practiced all ${targetCount} lesson item${targetCount === 1 ? "" : "s"}.`
				: `You reached ${coveredTargetCount} of ${targetCount || 1} lesson item${
						targetCount === 1 ? "" : "s"
					}.`,
			spokeEnoughForPractice
				? "You can finish now or repeat one more time for extra confidence."
				: "Repeat the current word or phrase once more before finishing.",
		],
	};
}

function getLessonReviewInsightCards(review: LessonReview) {
	return [
		{ label: "Speaking", value: review.ratings.speaking, color: "#19CC33" },
		{ label: "Practice", value: review.ratings.pronunciation, color: "#168BFF" },
		{ label: "Focus", value: review.ratings.grammar, color: "#654BFF" },
	];
}

export default function AudioLessonScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const { getToken, isLoaded: isAuthLoaded, userId } = useAuth();
	const { user } = useUser();
	const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
	const selectedLanguageCode = useLanguageStore((state) => state.selectedLanguageCode);
	const lesson = lessonId ? getLessonById(lessonId) : undefined;
	const activeLanguageCode =
		lesson && selectedLanguageCode === lesson.languageCode
			? selectedLanguageCode
			: lesson?.languageCode;
	const language = activeLanguageCode ? getLanguageByCode(activeLanguageCode) : undefined;
	const completedLessonIds = useProgressStore((state) =>
		lesson
			? state.getProgressForLanguage(lesson.languageCode).completedLessonIds
			: emptyCompletedLessonIds,
	);
	const completedLessonRecord = useProgressStore((state) =>
		lesson
			? state.getProgressForLanguage(lesson.languageCode).completedLessonsById[lesson.id]
			: null,
	);
	const markLessonCompleted = useProgressStore((state) => state.markLessonCompleted);
	const [activeCall, setActiveCall] = useState<Call | null>(null);
	const [callStatus, setCallStatus] = useState<CallStatus>("idle");
	const [callError, setCallError] = useState<string | null>(null);
	const [agentStatus, setAgentStatus] = useState<AgentConnectionStatus>("idle");
	const [agentError, setAgentError] = useState<string | null>(null);
	const [agentSession, setAgentSession] = useState<VisionAgentSession | null>(null);
	const [captionError, setCaptionError] = useState<string | null>(null);
	const [interimCaptionTextBySpeaker, setInterimCaptionTextBySpeaker] = useState<
		Partial<Record<CaptionSpeakerKind, string>>
	>({});
	const [isTeacherTurnActive, setIsTeacherTurnActive] = useState(false);
	const [hasTeacherCompletedTurn, setHasTeacherCompletedTurn] = useState(false);
	const [latestTeacherSpeechText, setLatestTeacherSpeechText] = useState<string | null>(null);
	const [isAwaitingTeacherResponse, setIsAwaitingTeacherResponse] = useState(false);
	const [liveCaptions, setLiveCaptions] = useState<LiveCaption[]>([]);
	const [lessonReview, setLessonReview] = useState<LessonReview | null>(null);
	const [lessonReadyReview, setLessonReadyReview] = useState<LessonReview | null>(null);
	const [isRetryingCompletedLesson, setIsRetryingCompletedLesson] = useState(false);
	const [isMicOpen, setIsMicOpen] = useState(false);
	const [isMicChanging, setIsMicChanging] = useState(false);
	const [isMicReleasing, setIsMicReleasing] = useState(false);
	const [canPublishAudio, setCanPublishAudio] = useState(true);
	const [isLessonInfoVisible, setIsLessonInfoVisible] = useState(false);
	const [isFinishingLesson, setIsFinishingLesson] = useState(false);
	const [isFinishPromptUnlocked, setIsFinishPromptUnlocked] = useState(false);
	const [isReviewingFinishTarget, setIsReviewingFinishTarget] = useState(false);
	const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);

	const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
	const [targetAttemptCounts, setTargetAttemptCounts] = useState<TargetAttemptCounts>({});
	const [learnerAttemptCount, setLearnerAttemptCount] = useState(0);
	const [learnerSpokenTurnCount, setLearnerSpokenTurnCount] = useState(0);

	const didAutoStartCall = useRef(false);
	const activeCallRef = useRef<Call | null>(null);
	const agentSessionRef = useRef<VisionAgentSession | null>(null);
	const isStartingCallRef = useRef(false);
	const agentStartCallIdRef = useRef<string | null>(null);
	const getTokenRef = useRef(getToken);
	const isMountedRef = useRef(false);
	const shouldCloseMicAfterOpenRef = useRef(false);
	const didFinishLessonRef = useRef(false);
	const didRequestFinishLessonRef = useRef(false);
	const didRecordCurrentMicAttemptRef = useRef(false);
	const audioPermissionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const releaseMicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const streamClientRef = useRef<StreamVideoClient | null>(null);
	const teacherLoadingSoundPlayer = useAudioPlayer(sounds.teacherLoadingChime);

	const isBusy = callStatus === "creating" || callStatus === "connecting";
	const isJoined = callStatus === "joined";
	const isLessonCompleted = lesson ? completedLessonIds.includes(lesson.id) : false;
	const teacherTargetItems = useMemo<TeacherTargetItem[]>(
		() => (lesson ? [...lesson.vocabulary, ...lesson.phrases] : []),
		[lesson],
	);
	const targetCount = teacherTargetItems.length;
	const [maxTargetIndex, setMaxTargetIndex] = useState(0);
	const highestTargetIndex = Math.max(currentTargetIndex, maxTargetIndex);
	const clampedTargetIndex =
		targetCount > 0 ? Math.min(Math.max(highestTargetIndex, 0), targetCount - 1) : 0;
	const displayTargetItem = teacherTargetItems[clampedTargetIndex] ?? null;
	const displayTargetIndex = displayTargetItem ? clampedTargetIndex : currentTargetIndex;
	const activeTargetPositionCount =
		targetCount > 0 ? Math.min(displayTargetIndex + 1, targetCount) : 0;
	const practicedTargetCount = teacherTargetItems.reduce((count, item) => {
		const targetItemId = getTeacherTargetItemId(item);
		return targetAttemptCounts[targetItemId] > 0 ? count + 1 : count;
	}, 0);
	const targetAttemptCount = Object.values(targetAttemptCounts).reduce(
		(total, count) => total + count,
		0,
	);
	const currentTargetAttemptCount = displayTargetItem
		? (targetAttemptCounts[getTeacherTargetItemId(displayTargetItem)] ?? 0)
		: 0;
	const coveredTargetsBeforeCurrent =
		targetCount > 0 ? Math.min(displayTargetIndex, targetCount) : 0;
	const visibleTargetCoverageCount =
		targetCount > 0 && currentTargetAttemptCount > 0
			? Math.min(displayTargetIndex + 1, targetCount)
			: coveredTargetsBeforeCurrent;
	const practiceCoverageCount = Math.max(practicedTargetCount, visibleTargetCoverageCount);
	const lessonProgressPercent =
		targetCount > 0 ? Math.min((activeTargetPositionCount / targetCount) * 100, 100) : 0;
	const reviewAttemptCount = Math.max(
		learnerAttemptCount,
		learnerSpokenTurnCount,
		targetAttemptCount,
	);
	const completedPracticeTargetCount =
		targetCount > 0 ? Math.min(targetCount, practiceCoverageCount) : reviewAttemptCount;
	const storedLessonReview = completedLessonRecord?.review ?? null;
	const shouldShowCompletedLessonView =
		Boolean(lesson && isLessonCompleted && !isRetryingCompletedLesson) && !isBusy && !isJoined;
	const shouldShowLessonReview = Boolean(
		lesson &&
			lessonReview &&
			(!isLessonCompleted || isRetryingCompletedLesson) &&
			!isBusy &&
			!isJoined,
	);
	const isTeacherTalking = isTeacherTurnActive || Boolean(interimCaptionTextBySpeaker.teacher);
	const isTeacherThinking = isAwaitingTeacherResponse && !isTeacherTalking;
	const hasTeacherSpoken = hasTeacherCompletedTurn || latestTeacherSpeechText !== null;
	const canUsePushToTalk =
		isJoined &&
		agentStatus === "connected" &&
		hasTeacherSpoken &&
		canPublishAudio &&
		!isFinishingLesson &&
		!isTeacherTalking &&
		!isTeacherThinking &&
		!isMicChanging &&
		!isMicReleasing;
	const isReadyToFinishByProgress = targetCount > 0 && completedPracticeTargetCount >= targetCount;
	const inferredLessonReadyReview = useMemo(
		() =>
			isReadyToFinishByProgress
				? buildHonestLessonReview(reviewAttemptCount, completedPracticeTargetCount, targetCount)
				: null,
		[completedPracticeTargetCount, isReadyToFinishByProgress, reviewAttemptCount, targetCount],
	);
	const activeLessonReadyReview = lessonReadyReview ?? inferredLessonReadyReview;
	const isPracticeReadyToFinish = Boolean(activeLessonReadyReview);
	const currentTargetAttemptLabel = `${currentTargetAttemptCount} ${
		currentTargetAttemptCount === 1 ? "try" : "tries"
	}`;
	const shouldShowDonePracticingControl =
		isJoined && agentStatus === "connected" && isPracticeReadyToFinish && isFinishPromptUnlocked;
	const canPressFinishLesson =
		shouldShowDonePracticingControl && !isMicOpen && !isMicChanging && !isMicReleasing;
	const availableTeacherStageHeight = windowHeight - insets.top - insets.bottom - 148;
	const teacherStageHeight = Math.max(430, Math.min(660, availableTeacherStageHeight));
	const isCompactLessonView = teacherStageHeight < 520;
	const captionRows = useMemo<CaptionRow[]>(() => {
		const liveSpeakerKinds = new Set(liveCaptions.map((caption) => caption.speakerKind));
		const mergedInterims = {
			...interimCaptionTextBySpeaker,
			...(isMicOpen
				? { learner: interimCaptionTextBySpeaker.learner ?? learnerListeningCaption }
				: null),
		};
		const rows = liveCaptions.map<CaptionRow>((caption) => ({
			id: `${caption.speaker_id}-${caption.start_time}`,
			speakerKind: caption.speakerKind,
			speakerLabel: caption.speakerLabel,
			text: caption.text,
			isInterim: false,
		}));

		Object.entries(mergedInterims).forEach(([speakerKind, text]) => {
			if (!isCaptionSpeakerKind(speakerKind) || !text || liveSpeakerKinds.has(speakerKind)) {
				return;
			}

			rows.push({
				id: `interim-${speakerKind}`,
				speakerKind,
				speakerLabel: getCaptionSpeakerLabel(speakerKind),
				text,
				isInterim: true,
			});
		});

		return rows.slice(-2);
	}, [interimCaptionTextBySpeaker, isMicOpen, liveCaptions]);

	const formatCaptionForReading = useCallback(
		(text: string) => {
			if (!lesson) {
				return text;
			}

			return [...lesson.phrases, ...lesson.vocabulary].reduce((captionText, item) => {
				const originalText = "text" in item ? item.text : item.term;
				const readableText = formatLessonTextForReading(originalText, item.pronunciation);

				if (readableText === originalText || !captionText.includes(originalText)) {
					return captionText;
				}

				return captionText.replaceAll(originalText, readableText);
			}, text);
		},
		[lesson],
	);

	const updateCurrentTargetIndex = useCallback((targetIndex: number) => {
		setCurrentTargetIndex((currentValue) => Math.max(currentValue, targetIndex));
		setMaxTargetIndex((currentValue) => Math.max(currentValue, targetIndex));
	}, []);

	const recordTargetAttempt = useCallback((targetItem: TeacherTargetItem | null) => {
		if (!targetItem) {
			return;
		}

		const targetItemId = getTeacherTargetItemId(targetItem);

		setTargetAttemptCounts((currentValue) => ({
			...currentValue,
			[targetItemId]: (currentValue[targetItemId] ?? 0) + 1,
		}));
	}, []);

	const recordTargetAttemptsThroughIndex = useCallback(
		(targetIndex: number) => {
			if (targetIndex < 0) {
				return;
			}

			setTargetAttemptCounts((currentValue) => {
				const nextValue = { ...currentValue };
				const clampedIndex = Math.min(targetIndex, teacherTargetItems.length - 1);

				for (let index = 0; index <= clampedIndex; index += 1) {
					const targetItem = teacherTargetItems[index];

					if (targetItem) {
						const targetItemId = getTeacherTargetItemId(targetItem);
						nextValue[targetItemId] = Math.max(nextValue[targetItemId] ?? 0, 1);
					}
				}

				return nextValue;
			});
		},
		[teacherTargetItems],
	);

	const syncTargetFromLessonText = useCallback(
		(text: string) => {
			const targetIndex = getTargetItemIndex(text, teacherTargetItems);

			if (targetIndex >= 0) {
				if (targetIndex > displayTargetIndex) {
					recordTargetAttemptsThroughIndex(targetIndex - 1);
				}
				updateCurrentTargetIndex(targetIndex);
			}

			return targetIndex;
		},
		[
			displayTargetIndex,
			recordTargetAttemptsThroughIndex,
			teacherTargetItems,
			updateCurrentTargetIndex,
		],
	);

	useEffect(() => {
		getTokenRef.current = getToken;
	}, [getToken]);

	useEffect(() => {
		restoreLessonPlaybackAudioMode().catch((error) => {
			console.warn("Failed to configure lesson sound effects:", error);
		});
	}, []);

	const playTeacherTurnEndedSound = useCallback(() => {
		teacherLoadingSoundPlayer
			.seekTo(0)
			.then(() => {
				teacherLoadingSoundPlayer.play();
			})
			.catch((error) => {
				console.warn("Failed to play teacher loading sound:", error);
			});
	}, [teacherLoadingSoundPlayer]);

	useEffect(() => {
		if (!isTeacherThinking) {
			return;
		}

		const timeout = setTimeout(() => {
			if (!isMountedRef.current) {
				return;
			}

			setIsAwaitingTeacherResponse(false);
			setHasTeacherCompletedTurn(true);
			setInterimCaptionTextBySpeaker((currentValue) => {
				const { learner: _learnerCaption, ...nextValue } = currentValue;
				return nextValue;
			});
		}, teacherResponseTimeoutMs);

		return () => {
			clearTimeout(timeout);
		};
	}, [isTeacherThinking, setInterimCaptionTextBySpeaker]);

	useEffect(() => {
		agentSessionRef.current = agentSession;
	}, [agentSession]);

	const stopAgentSession = useCallback(async () => {
		const agentSession = agentSessionRef.current;

		if (!agentSession) {
			return;
		}

		agentSessionRef.current = null;

		try {
			const clerkToken = await getTokenRef.current();

			if (!clerkToken) {
				throw new Error("Missing Clerk session token.");
			}

			const response = await fetch(getApiUrl("/api/vision-agent/stop"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${clerkToken}`,
				},
				body: JSON.stringify({
					callId: agentSession.call_id,
					sessionId: agentSession.session_id,
				}),
			});

			if (!response.ok && response.status !== 204) {
				throw new Error("Unable to stop the AI teacher.");
			}

			if (isMountedRef.current) {
				setAgentSession(null);
				setAgentStatus("idle");
				setAgentError(null);
			}
		} catch (error) {
			console.warn("Failed to stop Vision Agent session:", error);

			if (isMountedRef.current) {
				setAgentStatus("failed");
				setAgentError(error instanceof Error ? error.message : "Unable to stop the AI teacher.");
			}
		}
	}, [setAgentError, setAgentSession, setAgentStatus]);

	const cleanupLessonResources = useCallback(async () => {
		if (releaseMicTimeoutRef.current) {
			clearTimeout(releaseMicTimeoutRef.current);
			releaseMicTimeoutRef.current = null;
		}

		await stopAgentSession();

		const currentCall = activeCallRef.current;

		if (currentCall?.state.callingState !== callingStateLeft) {
			try {
				await currentCall?.leave();
			} catch (error) {
				console.warn("Failed to leave Stream audio lesson call:", error);
			}
		}

		activeCallRef.current = null;
		setLiveCaptions([]);
		setIsTeacherTurnActive(false);
		setHasTeacherCompletedTurn(false);
		setLatestTeacherSpeechText(null);
		setIsAwaitingTeacherResponse(false);
		setIsMicReleasing(false);
		setCaptionError(null);
		setInterimCaptionTextBySpeaker({});
		setCurrentTargetIndex(0);
		setMaxTargetIndex(0);
		setTargetAttemptCounts({});
		setLearnerSpokenTurnCount(0);
		setLessonReadyReview(null);
		setCanPublishAudio(true);
		setIsFinishingLesson(false);
		setIsFinishPromptUnlocked(false);
		setIsReviewingFinishTarget(false);

		const currentClient = streamClientRef.current;

		if (currentClient) {
			try {
				await currentClient.disconnectUser();
			} catch (error) {
				console.warn("Failed to disconnect Stream audio lesson client:", error);
			}
		}

		streamClientRef.current = null;
	}, [setCaptionError, setInterimCaptionTextBySpeaker, setLiveCaptions, stopAgentSession]);

	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			cleanupLessonResources();
		};
	}, [cleanupLessonResources]);

	const signedInUserName = useMemo(
		() => user?.fullName ?? user?.firstName ?? user?.username ?? "Language learner",
		[user?.firstName, user?.fullName, user?.username],
	);

	const requestCallSession = useCallback(async () => {
		if (!lesson || !language) {
			throw new Error("Lesson and language context are required.");
		}

		if (!isAuthLoaded || !userId) {
			throw new Error("Sign in before starting an audio lesson.");
		}

		const clerkToken = await getToken();

		if (!clerkToken) {
			throw new Error("Missing Clerk session token.");
		}

		const response = await fetch(getApiUrl("/api/stream/audio-call"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clerkToken}`,
			},
			body: JSON.stringify({
				lessonId: lesson.id,
				lessonTitle: lesson.title,
				lessonDescription: lesson.description,
				languageCode: language.code,
				languageName: language.name,
				goals: lesson.goals,
				vocabulary: lesson.vocabulary,
				phrases: lesson.phrases,
				aiTeacherPrompt: lesson.aiTeacherPrompt,
				userName: signedInUserName,
				userImage: user?.imageUrl,
			}),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			throw new Error(body?.error ?? "Unable to create Stream audio lesson call.");
		}

		return (await response.json()) as StreamAudioCallSession;
	}, [getToken, isAuthLoaded, language, lesson, signedInUserName, user?.imageUrl, userId]);

	const requestStreamToken = useCallback(async () => {
		const clerkToken = await getToken();

		if (!clerkToken) {
			throw new Error("Missing Clerk session token.");
		}

		const response = await fetch(getApiUrl("/api/stream/session"), {
			method: "GET",
			headers: {
				Authorization: `Bearer ${clerkToken}`,
			},
		});

		if (!response.ok) {
			throw new Error("Unable to refresh Stream token.");
		}

		const session = (await response.json()) as Pick<StreamAudioCallSession, "token">;
		return session.token;
	}, [getToken]);

	const getLessonStreamClient = useCallback(
		async (session: StreamAudioCallSession) => {
			if (streamClient) {
				return streamClient;
			}

			const { StreamVideoClient } = await loadStreamVideoSdk();
			const streamUser: User = {
				id: session.userId,
				name: session.userName,
				image: session.userImage,
			};
			const tokenProvider: TokenProvider = requestStreamToken;
			const client = StreamVideoClient.getOrCreateInstance({
				apiKey: session.apiKey,
				user: streamUser,
				token: session.token,
				tokenProvider,
			});

			setStreamClient(client);
			streamClientRef.current = client;
			return client;
		},
		[requestStreamToken, setStreamClient, streamClient],
	);

	const startAgentSession = useCallback(
		async (session: StreamAudioCallSession) => {
			if (agentSessionRef.current?.call_id === session.callId) {
				return;
			}

			if (agentStartCallIdRef.current === session.callId) {
				return;
			}

			agentStartCallIdRef.current = session.callId;
			setAgentStatus("connecting");
			setAgentError(null);

			try {
				const clerkToken = await getToken();

				if (!clerkToken) {
					throw new Error("Missing Clerk session token.");
				}

				const response = await fetch(getApiUrl("/api/vision-agent/start"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${clerkToken}`,
					},
					body: JSON.stringify({
						callId: session.callId,
						callType: session.callType,
					}),
				});

				const responseBody = (await response.json().catch(() => null)) as
					| VisionAgentSession
					| { error?: string }
					| null;

				if (!response.ok || !responseBody || !("session_id" in responseBody)) {
					throw new Error(
						(responseBody && "error" in responseBody && responseBody.error) ||
							"Unable to connect the AI teacher.",
					);
				}

				if (
					!isMountedRef.current ||
					activeCallRef.current?.state.callingState === callingStateLeft
				) {
					await fetch(getApiUrl("/api/vision-agent/stop"), {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${clerkToken}`,
						},
						body: JSON.stringify({
							callId: responseBody.call_id,
							sessionId: responseBody.session_id,
						}),
					});
					return;
				}

				agentSessionRef.current = responseBody;
				setAgentSession(responseBody);
				setAgentStatus("connected");
			} catch (error) {
				setAgentStatus("failed");
				setAgentError(error instanceof Error ? error.message : "Unable to connect the AI teacher.");
			} finally {
				if (agentStartCallIdRef.current === session.callId) {
					agentStartCallIdRef.current = null;
				}
			}
		},
		[getToken, setAgentError, setAgentSession, setAgentStatus],
	);

	const startLiveCaptions = useCallback(
		async (call: Call) => {
			setCaptionError(null);
			call.updateClosedCaptionSettings({
				visibilityDurationMs: 5200,
				maxVisibleCaptions: 3,
			});

			if (call.state.captioning) {
				return;
			}

			try {
				await call.startClosedCaptions({
					language: "auto",
					speech_segment_config: {
						max_speech_caption_ms: 5000,
						silence_duration_ms: 300,
					},
				});
			} catch (error) {
				console.warn("Failed to start Stream closed captions:", error);
				setCaptionError(
					"Live captions are not available yet. Enable closed captions for this Stream call type.",
				);
			}
		},
		[setCaptionError],
	);

	const startOrJoinCall = useCallback(async () => {
		if (isBusy || isJoined || isStartingCallRef.current) {
			return;
		}

		isStartingCallRef.current = true;
		didAutoStartCall.current = true;
		setCallStatus("creating");
		setCallError(null);
		didFinishLessonRef.current = false;
		didRecordCurrentMicAttemptRef.current = false;
		setCurrentTargetIndex(0);
		setMaxTargetIndex(0);
		setTargetAttemptCounts({});
		setLearnerAttemptCount(0);
		setLearnerSpokenTurnCount(0);
		setIsTeacherTurnActive(false);
		setHasTeacherCompletedTurn(false);
		setLatestTeacherSpeechText(null);
		setIsAwaitingTeacherResponse(false);
		setInterimCaptionTextBySpeaker({});
		setLessonReadyReview(null);
		setCanPublishAudio(true);
		setIsFinishingLesson(false);
		setIsFinishPromptUnlocked(false);
		setIsReviewingFinishTarget(false);

		try {
			const session = await requestCallSession();
			const streamClient = await getLessonStreamClient(session);
			setCallStatus("connecting");

			const call = streamClient.call(session.callType, session.callId, { reuseInstance: true });
			call.setDisconnectionTimeout(120);
			activeCallRef.current = call;
			setActiveCall(call);

			await call.join({ create: true });
			await call.camera.disable();
			await call.microphone.disable();
			await restoreLessonPlaybackAudioMode();
			await startLiveCaptions(call);

			setIsMicOpen(false);
			setIsMicReleasing(false);
			setCallStatus("joined");
			await startAgentSession(session);
		} catch (error) {
			didAutoStartCall.current = false;
			setCallStatus("error");
			setCallError(getStreamVideoErrorMessage(error));
		} finally {
			isStartingCallRef.current = false;
		}
	}, [
		getLessonStreamClient,
		isBusy,
		isJoined,
		requestCallSession,
		setActiveCall,
		setCallError,
		setCallStatus,
		setCurrentTargetIndex,
		setIsMicOpen,
		startAgentSession,
		startLiveCaptions,
	]);

	useEffect(() => {
		if (
			didAutoStartCall.current ||
			!lesson ||
			!language ||
			!isAuthLoaded ||
			!userId ||
			lessonReview ||
			(isLessonCompleted && !isRetryingCompletedLesson)
		) {
			return;
		}

		startOrJoinCall();
	}, [
		isAuthLoaded,
		isLessonCompleted,
		isRetryingCompletedLesson,
		language,
		lesson,
		lessonReview,
		startOrJoinCall,
		userId,
	]);

	const openPushToTalk = useCallback(async () => {
		if (
			!activeCall ||
			!isJoined ||
			!canPublishAudio ||
			isMicOpen ||
			isMicReleasing ||
			agentStatus !== "connected" ||
			isAwaitingTeacherResponse ||
			interimCaptionTextBySpeaker.teacher
		) {
			return;
		}

		try {
			shouldCloseMicAfterOpenRef.current = false;
			didRecordCurrentMicAttemptRef.current = false;
			setIsMicChanging(true);
			await activeCall.microphone.enable();
			if (shouldCloseMicAfterOpenRef.current) {
				shouldCloseMicAfterOpenRef.current = false;
				await activeCall.microphone.disable();
				setIsMicOpen(false);
				setIsMicReleasing(false);
				return;
			}
			setIsMicOpen(true);
		} catch (error) {
			setCallError(error instanceof Error ? error.message : "Unable to open microphone.");
		} finally {
			setIsMicChanging(false);
		}
	}, [
		activeCall,
		agentStatus,
		canPublishAudio,
		interimCaptionTextBySpeaker.teacher,
		isAwaitingTeacherResponse,
		isJoined,
		isMicOpen,
		isMicReleasing,
		setCallError,
		setIsMicChanging,
		setIsMicOpen,
	]);

	const closePushToTalk = useCallback(async () => {
		if (isMicChanging) {
			shouldCloseMicAfterOpenRef.current = true;
			return;
		}

		if (!activeCall || !isJoined || !isMicOpen || isMicReleasing) {
			return;
		}

		setIsMicOpen(false);
		setIsMicReleasing(true);
		setIsAwaitingTeacherResponse(true);
		setLearnerSpokenTurnCount((currentValue) => currentValue + 1);
		if (!didRecordCurrentMicAttemptRef.current) {
			recordTargetAttempt(displayTargetItem ?? null);
			didRecordCurrentMicAttemptRef.current = true;
		}

		if (releaseMicTimeoutRef.current) {
			clearTimeout(releaseMicTimeoutRef.current);
		}

		releaseMicTimeoutRef.current = setTimeout(() => {
			releaseMicTimeoutRef.current = null;
			activeCall.microphone
				.disable()
				.then(() =>
					restoreLessonPlaybackAudioMode().catch((error) => {
						console.warn("Failed to restore lesson playback audio:", error);
					}),
				)
				.catch((error) => {
					setCallError(error instanceof Error ? error.message : "Unable to close microphone.");
				})
				.finally(() => {
					setIsMicReleasing(false);
				});
		}, pushToTalkReleaseTailMs);
	}, [
		activeCall,
		displayTargetItem,
		isJoined,
		isMicChanging,
		isMicOpen,
		isMicReleasing,
		recordTargetAttempt,
		setCallError,
		setIsAwaitingTeacherResponse,
		setIsMicOpen,
		setIsMicReleasing,
	]);

	const cancelAwaitingTeacherResponse = useCallback(() => {
		setIsAwaitingTeacherResponse(false);
		setHasTeacherCompletedTurn(true);
		setInterimCaptionTextBySpeaker((currentValue) => {
			const { learner: _learnerCaption, ...nextValue } = currentValue;
			return nextValue;
		});
	}, [setHasTeacherCompletedTurn, setInterimCaptionTextBySpeaker, setIsAwaitingTeacherResponse]);

	const finishTeachingSession = useCallback(
		async (review?: LessonReview) => {
			if (didFinishLessonRef.current) {
				return;
			}

			const completedTargetCount = targetCount > 0 ? clampedTargetIndex + 1 : 0;
			const nextReview =
				review ?? buildHonestLessonReview(reviewAttemptCount, completedTargetCount, targetCount);

			didFinishLessonRef.current = true;
			await cleanupLessonResources();
			setActiveCall(null);
			setStreamClient(null);
			setIsMicOpen(false);
			setIsMicReleasing(false);
			setLessonReview(nextReview);
			setCallStatus("ended");
		},
		[
			clampedTargetIndex,
			cleanupLessonResources,
			reviewAttemptCount,
			setActiveCall,
			setCallStatus,
			setIsMicOpen,
			setLessonReview,
			setStreamClient,
			targetCount,
		],
	);

	useEffect(() => {
		if (!activeCall) {
			return;
		}

		const subscription = activeCall.state.ownCapabilities$.subscribe((ownCapabilities) => {
			if (!isJoined) {
				setCanPublishAudio(true);
				return;
			}

			const nextCanPublishAudio = ownCapabilities.includes("send-audio");
			setCanPublishAudio(nextCanPublishAudio);

			if (nextCanPublishAudio) {
				if (audioPermissionTimeoutRef.current) {
					clearTimeout(audioPermissionTimeoutRef.current);
					audioPermissionTimeoutRef.current = null;
				}
				return;
			}

			setIsMicOpen(false);
			setIsMicReleasing(false);
			if (audioPermissionTimeoutRef.current) {
				return;
			}

			audioPermissionTimeoutRef.current = setTimeout(() => {
				audioPermissionTimeoutRef.current = null;
				setCallError(
					"This lesson call cannot publish microphone audio yet. Please restart the lesson.",
				);
			}, audioPermissionHydrationTimeoutMs);
		});

		return () => {
			if (audioPermissionTimeoutRef.current) {
				clearTimeout(audioPermissionTimeoutRef.current);
				audioPermissionTimeoutRef.current = null;
			}
			subscription.unsubscribe();
		};
	}, [activeCall, isJoined, setCallError, setIsMicOpen]);

	useEffect(() => {
		if (!activeCall) {
			return;
		}

		const subscription = activeCall.state.closedCaptions$.subscribe((captions) => {
			const nextCaptions = captions.map((caption) => toLiveCaption(caption, userId));
			let highestMatchedTargetIndex = -1;

			setLiveCaptions(nextCaptions);

			for (const caption of nextCaptions) {
				if (!caption.text.trim()) {
					continue;
				}

				if (caption.speakerKind === "teacher") {
					highestMatchedTargetIndex = Math.max(
						highestMatchedTargetIndex,
						getTargetItemIndex(caption.text, teacherTargetItems),
					);
					setLatestTeacherSpeechText(caption.text);
					setIsAwaitingTeacherResponse(false);
				}
			}

			if (highestMatchedTargetIndex >= 0) {
				if (highestMatchedTargetIndex > displayTargetIndex) {
					recordTargetAttemptsThroughIndex(highestMatchedTargetIndex - 1);
				}
				updateCurrentTargetIndex(highestMatchedTargetIndex);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [
		activeCall,
		displayTargetIndex,
		recordTargetAttemptsThroughIndex,
		teacherTargetItems,
		updateCurrentTargetIndex,
		userId,
	]);

	useEffect(() => {
		if (!activeCall) {
			return;
		}

		const unsubscribe = activeCall.on("custom", (event) => {
			const finishReview = parseAudioLessonFinishReviewEvent(event);

			if (finishReview) {
				const completedTargetCount = getCompletedTargetCountFromReview(finishReview);

				if (completedTargetCount !== null) {
					recordTargetAttemptsThroughIndex(completedTargetCount - 1);
				}

				setLessonReadyReview(finishReview);
				setIsAwaitingTeacherResponse(false);
				return;
			}

			const targetEvent = parseAudioLessonTargetEvent(event);

			if (targetEvent) {
				const targetIndex = teacherTargetItems.findIndex(
					(item) => getTeacherTargetItemId(item) === targetEvent.targetItemId,
				);
				const nextTargetIndex =
					targetIndex >= 0
						? targetIndex
						: Math.min(targetEvent.targetIndex, Math.max(targetEvent.targetCount - 1, 0));

				if (targetEvent.reason === "next") {
					recordTargetAttemptsThroughIndex(nextTargetIndex - 1);
				} else if (targetEvent.reason === "retry") {
					recordTargetAttemptsThroughIndex(nextTargetIndex);
				} else if (nextTargetIndex > displayTargetIndex) {
					recordTargetAttemptsThroughIndex(nextTargetIndex - 1);
				}

				updateCurrentTargetIndex(nextTargetIndex);

				return;
			}

			const captionEvent = parseAudioLessonCaptionEvent(event);

			if (!captionEvent) {
				return;
			}

			if (captionEvent.speakerKind === "teacher" && captionEvent.text && lesson) {
				syncTargetFromLessonText(captionEvent.text);

				setLatestTeacherSpeechText(captionEvent.text);
				setIsAwaitingTeacherResponse(false);
			}

			if (captionEvent.speakerKind === "teacher" && captionEvent.status === "started") {
				setIsTeacherTurnActive(true);
				setIsAwaitingTeacherResponse(false);
			}

			if (captionEvent.speakerKind === "teacher" && captionEvent.status === "ended") {
				setIsTeacherTurnActive(false);
				setHasTeacherCompletedTurn(true);
				playTeacherTurnEndedSound();
			}

			if (
				captionEvent.speakerKind === "learner" &&
				captionEvent.status === "transcript" &&
				captionEvent.text?.trim()
			) {
				const practicedTargetIndex = getTargetItemIndex(captionEvent.text, teacherTargetItems);
				const practicedTargetItem =
					practicedTargetIndex >= 0
						? teacherTargetItems[practicedTargetIndex]
						: (displayTargetItem ?? null);

				if (!didRecordCurrentMicAttemptRef.current) {
					recordTargetAttempt(practicedTargetItem);
					didRecordCurrentMicAttemptRef.current = true;
				}
				if (practicedTargetIndex >= 0) {
					updateCurrentTargetIndex(practicedTargetIndex);
				}
				setLearnerAttemptCount((currentValue) => currentValue + 1);
				setIsAwaitingTeacherResponse(true);
			}

			setInterimCaptionTextBySpeaker((currentValue) => {
				if (captionEvent.status === "ended") {
					if (
						captionEvent.speakerKind === "learner" &&
						currentValue.learner &&
						currentValue.learner !== learnerListeningCaption
					) {
						return currentValue;
					}

					const { [captionEvent.speakerKind]: _endedSpeaker, ...nextValue } = currentValue;
					return nextValue;
				}

				return {
					...currentValue,
					[captionEvent.speakerKind]:
						captionEvent.text ?? getInterimCaptionText(captionEvent.speakerKind),
				};
			});
		});

		return unsubscribe;
	}, [
		activeCall,
		displayTargetItem,
		finishTeachingSession,
		lesson,
		recordTargetAttempt,
		recordTargetAttemptsThroughIndex,
		playTeacherTurnEndedSound,
		setCallError,
		setCallStatus,
		syncTargetFromLessonText,
		displayTargetIndex,
		targetCount,
		teacherTargetItems,
		updateCurrentTargetIndex,
	]);

	useEffect(() => {
		if (!activeCall) {
			return;
		}

		const subscription = activeCall.state.callingState$.subscribe((nextCallingState) => {
			if (
				nextCallingState !== callingStateLeft ||
				callStatus !== "joined" ||
				agentStatus !== "connected" ||
				!lessonReadyReview ||
				!didRequestFinishLessonRef.current ||
				didFinishLessonRef.current
			) {
				return;
			}

			finishTeachingSession(lessonReadyReview).catch((error) => {
				setCallStatus("error");
				setCallError(error instanceof Error ? error.message : "Unable to finish the audio lesson.");
			});
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [
		activeCall,
		agentStatus,
		callStatus,
		finishTeachingSession,
		lessonReadyReview,
		setCallError,
		setCallStatus,
	]);

	useEffect(() => {
		if (!isJoined || agentStatus !== "connected" || !isPracticeReadyToFinish) {
			return;
		}

		const revealDelay =
			!isAwaitingTeacherResponse && !isTeacherTalking ? 350 : finalFeedbackFallbackMs;
		const fallbackTimer = setTimeout(() => {
			setIsFinishPromptUnlocked(true);
		}, revealDelay);

		return () => {
			clearTimeout(fallbackTimer);
		};
	}, [agentStatus, isAwaitingTeacherResponse, isJoined, isPracticeReadyToFinish, isTeacherTalking]);

	const resetLessonForRetry = useCallback(() => {
		didAutoStartCall.current = false;
		didFinishLessonRef.current = false;
		didRequestFinishLessonRef.current = false;
		setCallStatus("idle");
		setCallError(null);
		setAgentStatus("idle");
		setAgentError(null);
		setCaptionError(null);
		setInterimCaptionTextBySpeaker({});
		setIsTeacherTurnActive(false);
		setHasTeacherCompletedTurn(false);
		setLatestTeacherSpeechText(null);
		setIsAwaitingTeacherResponse(false);
		setLiveCaptions([]);
		setLessonReview(null);
		setLessonReadyReview(null);
		setIsRetryingCompletedLesson(true);
		setIsMicReleasing(false);
		setCanPublishAudio(true);
		setIsFinishingLesson(false);
		setIsFinishPromptUnlocked(false);
		didRecordCurrentMicAttemptRef.current = false;
		setCurrentTargetIndex(0);
		setMaxTargetIndex(0);
		setTargetAttemptCounts({});
		setLearnerAttemptCount(0);
		setLearnerSpokenTurnCount(0);
	}, [
		setAgentError,
		setAgentStatus,
		setCallError,
		setCallStatus,
		setCaptionError,
		setInterimCaptionTextBySpeaker,
		setIsRetryingCompletedLesson,
		setLessonReview,
		setLiveCaptions,
	]);

	const completeReviewedLesson = useCallback(() => {
		if (lesson && lessonReview) {
			markLessonCompleted(lesson.languageCode, lesson.id, lesson.xpReward, lessonReview);
		}
		setIsRetryingCompletedLesson(false);
		setCallStatus("ended");
		router.replace("/(tabs)/learn");
	}, [
		lesson,
		lessonReview,
		markLessonCompleted,
		router,
		setCallStatus,
		setIsRetryingCompletedLesson,
	]);

	const retryReviewedLesson = useCallback(() => {
		if (lesson && lessonReview) {
			markLessonCompleted(lesson.languageCode, lesson.id, lesson.xpReward, lessonReview);
		}
		resetLessonForRetry();
	}, [lesson, lessonReview, markLessonCompleted, resetLessonForRetry]);

	const finishPracticeAnyway = useCallback(() => {
		if (isFinishingLesson) {
			return;
		}

		didRequestFinishLessonRef.current = true;
		setIsLessonInfoVisible(false);
		setIsFinishingLesson(true);
		finishTeachingSession(
			activeLessonReadyReview ??
				buildHonestLessonReview(reviewAttemptCount, completedPracticeTargetCount, targetCount),
		).catch((error) => {
			setIsFinishingLesson(false);
			setCallStatus("error");
			setCallError(error instanceof Error ? error.message : "Unable to finish the audio lesson.");
		});
	}, [
		activeLessonReadyReview,
		completedPracticeTargetCount,
		finishTeachingSession,
		isFinishingLesson,
		reviewAttemptCount,
		setCallError,
		setCallStatus,
		setIsLessonInfoVisible,
		targetCount,
	]);

	const retryCompletedLesson = useCallback(() => {
		resetLessonForRetry();
	}, [resetLessonForRetry]);

	if (!lesson) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<View className="flex-1 items-center justify-center gap-5 px-6">
					<Text className="font-poppins-bold text-[22px] leading-7 text-neutral-primary">
						Lesson not found
					</Text>
					<TouchableOpacity
						accessibilityLabel="Go back to lessons"
						accessibilityRole="button"
						activeOpacity={0.86}
						style={styles.emptyButton}
						onPress={() => router.replace("/(tabs)/learn")}
					>
						<Text className="font-poppins-bold text-[16px] text-white">Back to lessons</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	if (shouldShowLessonReview && lessonReview) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<View style={styles.reviewScreen}>
					<ScrollView
						style={styles.lessonResultScroll}
						contentContainerStyle={styles.lessonResultContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.reviewHero}>
							<Image
								source={images.mascotWelcome}
								style={styles.reviewMascot}
								contentFit="contain"
							/>
							<View style={styles.reviewBadge}>
								<Ionicons name="sparkles" size={28} color="#FFFFFF" />
							</View>
						</View>

						<Text className="mt-6 text-center font-poppins-bold text-[28px] leading-[34px] text-neutral-primary">
							Practice review
						</Text>
						<Text className="mt-2 text-center font-poppins-medium text-[15px] leading-[22px] text-[#64708D]">
							Your {lesson.title} practice is ready to finish.
						</Text>

						<View style={styles.feedbackCard}>
							{getLessonReviewInsightCards(lessonReview).map((card, index) => (
								<View key={card.label} className="flex-1 flex-row items-center">
									<View style={styles.feedbackColumn}>
										<Text
											adjustsFontSizeToFit
											className="text-center font-poppins-bold text-[12px] leading-[17px] text-neutral-primary"
											minimumFontScale={0.68}
											numberOfLines={1}
										>
											{card.label}
										</Text>
										<Text
											adjustsFontSizeToFit
											className="mt-1.5 text-center font-poppins-bold text-[13px] leading-[18px]"
											minimumFontScale={0.62}
											numberOfLines={1}
											style={{ color: card.color }}
										>
											{card.value}
										</Text>
									</View>
									{index < 2 ? <View style={styles.feedbackDivider} /> : null}
								</View>
							))}
						</View>

						<View style={styles.reviewCommentCard}>
							{lessonReview.comments.map((comment) => (
								<View key={comment} className="flex-row items-start gap-3">
									<Ionicons name="checkmark-circle" size={18} color="#21C16B" />
									<Text className="flex-1 font-poppins-medium text-[13px] leading-[19px] text-[#58617E]">
										{comment}
									</Text>
								</View>
							))}
						</View>

						<View style={styles.completedRewardCard}>
							<View>
								<Text className="font-poppins-bold text-[14px] leading-[19px] text-neutral-primary">
									XP earned
								</Text>
								<Text className="mt-1 font-poppins-medium text-[12px] leading-[17px] text-[#64708D]">
									Saved when you leave or retry.
								</Text>
							</View>
							<Text className="font-poppins-bold text-[30px] leading-[36px] text-lingua-purple">
								+{lesson.xpReward}
							</Text>
						</View>
					</ScrollView>

					<View
						style={[
							styles.lessonResultActionRow,
							{ paddingBottom: Math.max(insets.bottom + 8, 18) },
						]}
					>
						<TouchableOpacity
							accessibilityLabel="Save lesson progress and go back to lessons"
							accessibilityRole="button"
							activeOpacity={0.76}
							style={[styles.completedSecondaryButton, styles.lessonResultActionButton]}
							onPress={completeReviewedLesson}
						>
							<Text className="font-poppins-bold text-[15px] text-lingua-purple">
								Back to lessons
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityLabel="Save progress and try lesson again"
							accessibilityRole="button"
							activeOpacity={0.86}
							style={[styles.completedPrimaryButton, styles.lessonResultActionButton]}
							onPress={retryReviewedLesson}
						>
							<Text className="font-poppins-bold text-[15px] text-white">Try again</Text>
						</TouchableOpacity>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	if (shouldShowCompletedLessonView) {
		const completedReview = storedLessonReview ?? lessonReview ?? fallbackLessonReview;

		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<View style={styles.completedScreen}>
					<TouchableOpacity
						accessibilityLabel="Go back to lessons"
						accessibilityRole="button"
						activeOpacity={0.75}
						style={styles.completedBackButton}
						onPress={() => router.replace("/(tabs)/learn")}
					>
						<Ionicons name="chevron-back" size={34} color="#0D132B" />
					</TouchableOpacity>

					<ScrollView
						style={styles.lessonResultScroll}
						contentContainerStyle={styles.lessonResultContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.completedHero}>
							<Image
								source={images.mascotWelcome}
								style={styles.completedMascot}
								contentFit="contain"
							/>
							<View style={styles.completedCheckBadge}>
								<Ionicons name="checkmark" size={34} color="#FFFFFF" />
							</View>
						</View>

						<Text className="mt-6 text-center font-poppins-bold text-[28px] leading-[34px] text-neutral-primary">
							Results & insights
						</Text>
						<Text className="mt-2 text-center font-poppins-medium text-[15px] leading-[22px] text-[#64708D]">
							{lesson.title} is saved in your progress.
						</Text>
						<View style={styles.feedbackCard}>
							{getLessonReviewInsightCards(completedReview).map((card, index) => (
								<View key={card.label} className="flex-1 flex-row items-center">
									<View style={styles.feedbackColumn}>
										<Text
											adjustsFontSizeToFit
											className="text-center font-poppins-bold text-[14px] leading-[20px] text-neutral-primary"
											minimumFontScale={0.72}
											numberOfLines={1}
										>
											{card.label}
										</Text>
										<Text
											adjustsFontSizeToFit
											className="mt-2 text-center font-poppins-bold text-[13px] leading-[18px]"
											minimumFontScale={0.58}
											numberOfLines={1}
											style={{ color: card.color }}
										>
											{card.value}
										</Text>
									</View>
									{index < 2 ? <View style={styles.feedbackDivider} /> : null}
								</View>
							))}
						</View>
						<View style={styles.reviewCommentCard}>
							{completedReview.comments.map((comment) => (
								<View key={comment} className="flex-row items-start gap-3">
									<Ionicons name="checkmark-circle" size={18} color="#21C16B" />
									<Text className="flex-1 font-poppins-medium text-[13px] leading-[19px] text-[#58617E]">
										{comment}
									</Text>
								</View>
							))}
						</View>
						<Text className="mt-3 text-center font-poppins-medium text-[12px] leading-[17px] text-[#64708D]">
							You already earned XP for this lesson.
						</Text>
					</ScrollView>

					<View
						style={[
							styles.lessonResultActionRow,
							{ paddingBottom: Math.max(insets.bottom + 8, 18) },
						]}
					>
						<TouchableOpacity
							accessibilityLabel="Back to lessons"
							accessibilityRole="button"
							activeOpacity={0.76}
							style={[styles.completedSecondaryButton, styles.lessonResultActionButton]}
							onPress={() => router.replace("/(tabs)/learn")}
						>
							<Text className="font-poppins-bold text-[15px] text-lingua-purple">
								Back to lessons
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityLabel="Try lesson again"
							accessibilityRole="button"
							activeOpacity={0.86}
							style={[styles.completedPrimaryButton, styles.lessonResultActionButton]}
							onPress={retryCompletedLesson}
						>
							<Text className="font-poppins-bold text-[15px] text-white">Try again</Text>
						</TouchableOpacity>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	const isConnected = isJoined && agentStatus === "connected";
	const teacherModeLabel = !isConnected
		? agentStatus === "connecting" || callStatus === "connecting" || callStatus === "creating"
			? "Awaiting teacher..."
			: "Awaiting..."
		: isTeacherTalking
			? "Teacher: Speaking"
			: isTeacherThinking
				? "Teacher: Thinking"
				: isMicOpen
					? "Teacher: Listening"
					: hasTeacherSpoken
						? "Your turn"
						: "Teacher: Ready";
	const teacherModeIcon = !isConnected
		? "hourglass-outline"
		: isTeacherTalking
			? "volume-high-outline"
			: isTeacherThinking
				? "sparkles-outline"
				: isMicOpen
					? "ear-outline"
					: hasTeacherSpoken
						? "mic-outline"
						: "radio-outline";
	const teacherModePillStyle = !isConnected
		? { backgroundColor: "rgba(13, 19, 43, 0.4)", borderColor: "rgba(255, 255, 255, 0.4)" }
		: isTeacherTalking
			? { backgroundColor: "#6C4EF5", borderColor: "rgba(108, 78, 245, 0.1)" }
			: isTeacherThinking
				? { backgroundColor: "#FF8A00", borderColor: "rgba(255, 138, 0, 0.2)" }
				: isMicOpen
					? { backgroundColor: "#19CC33", borderColor: "rgba(25, 204, 51, 0.2)" }
					: { backgroundColor: "rgba(13, 19, 43, 0.64)", borderColor: "rgba(255, 255, 255, 0.72)" };
	const shouldShowReadyToFinishPrompt =
		Boolean(activeLessonReadyReview) &&
		isFinishPromptUnlocked &&
		isJoined &&
		agentStatus === "connected";
	const shouldShowTargetPractice = !shouldShowReadyToFinishPrompt || isReviewingFinishTarget;
	// Derive a human-readable label that reflects every possible button state
	const pushToTalkLabel = isMicOpen
		? "Release to stop"
		: isTeacherThinking
			? "Waiting..."
			: isTeacherTalking
				? "Listen first"
				: isMicChanging
					? "Please wait..."
					: !hasTeacherSpoken && agentStatus === "connected"
						? "Waiting..."
						: !canPublishAudio && agentStatus === "connected"
							? "Mic unavailable"
							: agentStatus === "connected"
								? "Hold to talk"
								: agentStatus === "connecting"
									? "Connecting..."
									: "Not ready";
	const pushToTalkSubLabel = isMicOpen
		? "Mic is live — release when done speaking."
		: isTeacherThinking
			? "The teacher is getting ready to respond."
			: isTeacherTalking
				? "Your mic stays muted while the teacher speaks."
				: !hasTeacherSpoken && agentStatus === "connected"
					? "Listen for the teacher's first word."
					: !canPublishAudio && agentStatus === "connected"
						? "Restart the lesson to refresh microphone permission."
						: canUsePushToTalk
							? "Hold to speak. Release to send."
							: "Wait for the teacher to finish.";
	const pushToTalkHint =
		canUsePushToTalk || isMicOpen
			? "Hold to speak. Release to mute your microphone."
			: "Wait until the AI teacher finishes before speaking again.";
	const callStatusLabel =
		callStatus === "creating"
			? "Creating call"
			: callStatus === "connecting"
				? "Connecting"
				: callStatus === "joined"
					? "Online"
					: callStatus === "ended"
						? "Call ended"
						: callStatus === "error"
							? "Needs attention"
							: "Ready to join";
	const callStatusDotColor =
		callStatus === "joined"
			? "#18D313"
			: callStatus === "creating" || callStatus === "connecting"
				? "#FFB020"
				: callStatus === "error"
					? "#FF424B"
					: "#A8AFBF";
	const agentStatusLabel =
		agentStatus === "connecting"
			? "Teacher connecting"
			: agentStatus === "connected"
				? "Teacher connected"
				: agentStatus === "failed"
					? "Teacher failed"
					: "Teacher idle";
	const agentStatusDotColor =
		agentStatus === "connected"
			? "#18D313"
			: agentStatus === "connecting"
				? "#FFB020"
				: agentStatus === "failed"
					? "#FF424B"
					: "#A8AFBF";
	const primaryGoal = lesson.goals[0]?.text ?? lesson.description;
	const lessonArtworkSource = getLessonArtworkSource(lesson.id);
	const displayTargetTerm = displayTargetItem
		? "term" in displayTargetItem
			? displayTargetItem.term
			: displayTargetItem.text
		: "";
	const displayTargetPartOfSpeech =
		displayTargetItem &&
		"partOfSpeech" in displayTargetItem &&
		typeof displayTargetItem.partOfSpeech === "string"
			? displayTargetItem.partOfSpeech
			: null;
	const displayTargetExample =
		displayTargetItem &&
		"example" in displayTargetItem &&
		typeof displayTargetItem.example === "string"
			? displayTargetItem.example
			: null;
	const displayTargetContext =
		displayTargetItem &&
		"context" in displayTargetItem &&
		typeof displayTargetItem.context === "string"
			? displayTargetItem.context
			: null;

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<View style={[styles.screenContent, { paddingBottom: 104 + insets.bottom }]}>
				<View className="flex-row items-center pb-2 pt-1.5">
					<TouchableOpacity
						accessibilityLabel="Go back"
						accessibilityRole="button"
						activeOpacity={0.75}
						className="h-12 w-12 items-start justify-center"
						onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/learn"))}
					>
						<Ionicons name="chevron-back" size={34} color="#0D132B" />
					</TouchableOpacity>

					<View className="flex-1">
						<Text className="font-poppins-bold text-[25px] leading-[31px] text-neutral-primary">
							AI Teacher
						</Text>
						<View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
							<View style={[styles.statusDot, { backgroundColor: callStatusDotColor }]} />
							<Text className="font-poppins-semibold text-[13px] leading-[18px] text-[#58617E]">
								{callStatusLabel}
							</Text>
							<Text className="font-poppins-bold text-[12px] leading-[17px] text-[#A8AFBF]">•</Text>
							<View style={[styles.statusDot, { backgroundColor: agentStatusDotColor }]} />
							<Text className="font-poppins-semibold text-[13px] leading-[18px] text-[#58617E]">
								{agentStatusLabel}
							</Text>
						</View>
					</View>
				</View>

				<View style={[styles.teacherStage, { height: teacherStageHeight }]}>
					<Image source={lessonArtworkSource} style={styles.stageBackground} contentFit="cover" />
					<View style={styles.stageOverlay} />

					<View style={styles.lessonPill}>
						<Text className="font-poppins-bold text-[14px] leading-[18px] text-white">
							{language?.name ?? lesson.languageCode.toUpperCase()}
						</Text>
						<Text className="font-poppins-medium text-[11px] leading-[15px] text-white/90">
							{lesson.title}
						</Text>
					</View>

					<View style={styles.lessonStatePanel}>
						<View
							className={`will-change-animation ${
								isTeacherThinking || isTeacherTalking || isMicOpen ? "animate-pulse" : ""
							}`}
							style={[styles.lessonStatePill, teacherModePillStyle]}
						>
							<Ionicons name={teacherModeIcon} size={16} color="#FFFFFF" />
							<Text className="font-poppins-bold text-[12px] leading-[16px] text-white">
								{teacherModeLabel}
							</Text>
						</View>
						{targetCount > 0 ? (
							<View style={styles.lessonProgressPill}>
								<View style={styles.lessonProgressMetaRow}>
									<Text
										className="font-poppins-bold text-[10px] leading-[14px] text-white"
										numberOfLines={1}
									>
										Word {activeTargetPositionCount}/{targetCount}
									</Text>
									<Text
										className="font-poppins-bold text-[10px] leading-[14px] text-white/85"
										numberOfLines={1}
									>
										{currentTargetAttemptLabel}
									</Text>
									<Ionicons name="flag-outline" size={13} color="#FFFFFF" />
								</View>
								<View style={styles.lessonProgressTrack}>
									<View
										style={[styles.lessonProgressFill, { width: `${lessonProgressPercent}%` }]}
									/>
								</View>
								{shouldShowDonePracticingControl ? (
									<TouchableOpacity
										activeOpacity={0.86}
										accessibilityLabel="Finish lesson practice"
										accessibilityRole="button"
										accessibilityState={
											!canPressFinishLesson || isFinishingLesson ? { disabled: true } : undefined
										}
										disabled={!canPressFinishLesson || isFinishingLesson}
										style={[
											styles.finishProgressButton,
											(!canPressFinishLesson || isFinishingLesson) &&
												styles.finishProgressButtonDisabled,
										]}
										onPress={finishPracticeAnyway}
									>
										{isFinishingLesson ? (
											<ActivityIndicator size="small" color="#FFFFFF" />
										) : (
											<Ionicons name="checkmark" size={15} color="#FFFFFF" />
										)}
										<Text className="font-poppins-bold text-[11px] leading-[15px] text-white">
											{isFinishingLesson ? "Finishing..." : "Finish Lesson"}
										</Text>
									</TouchableOpacity>
								) : null}
							</View>
						) : null}
					</View>

					<Image
						source={images.mascotWelcome}
						style={[styles.teacherMascot, isCompactLessonView && styles.teacherMascotCompact]}
						contentFit="contain"
					/>

					{/* Keep the current target visible so the learner always knows what to say. */}
					{shouldShowTargetPractice && displayTargetItem ? (
						<TouchableOpacity
							accessibilityLabel={
								shouldShowReadyToFinishPrompt
									? "Return to lesson completion message"
									: "Current lesson word"
							}
							accessibilityRole={shouldShowReadyToFinishPrompt ? "button" : undefined}
							activeOpacity={shouldShowReadyToFinishPrompt ? 0.86 : 1}
							disabled={!shouldShowReadyToFinishPrompt}
							style={[
								styles.responseBubble,
								isCompactLessonView ? styles.responseBubbleCompact : styles.responseBubbleRegular,
							]}
							onPress={() => setIsReviewingFinishTarget(false)}
						>
							<View className="flex-1">
								<View className="gap-1">
									<View className="flex-row items-center flex-wrap gap-2">
										<Text className="font-poppins-bold text-[18px] leading-[24px] text-[#6C4EF5]">
											{displayTargetTerm}
										</Text>
										{displayTargetPartOfSpeech ? (
											<View className="bg-lingua-purple/10 px-2 py-0.5 rounded-md">
												<Text className="font-poppins-bold text-[9px] leading-[13px] text-[#6C4EF5] uppercase">
													{displayTargetPartOfSpeech}
												</Text>
											</View>
										) : (
											<View className="bg-blue-50 px-2 py-0.5 rounded-md">
												<Text className="font-poppins-bold text-[9px] leading-[13px] text-blue-600 uppercase">
													phrase
												</Text>
											</View>
										)}
									</View>

									<View className="mt-0.5">
										{displayTargetItem.pronunciation ? (
											<Text className="self-start font-poppins-bold text-[12px] leading-[17px] text-[#FF8A00] bg-[#FFF5E6] px-1.5 py-0.5 rounded">
												/{displayTargetItem.pronunciation}/
											</Text>
										) : null}
										<Text className="mt-1 font-poppins-bold text-[14px] leading-[19px] text-[#19CC33]">
											means {'"' + displayTargetItem.translation + '"'}
										</Text>
									</View>

									{displayTargetExample ? (
										<Text className="mt-1 font-poppins-medium italic text-[11px] leading-[16px] text-[#58617E] bg-[#F7F8FA] p-2 rounded-lg border-l-2 border-[#6C4EF5]">
											{'"' + displayTargetExample + '"'}
										</Text>
									) : null}

									{displayTargetContext ? (
										<Text className="mt-1 font-poppins-medium italic text-[11px] leading-[16px] text-[#58617E] bg-[#F7F8FA] p-2 rounded-lg border-l-2 border-blue-500">
											💡 {displayTargetContext}
										</Text>
									) : null}

									{shouldShowReadyToFinishPrompt ? (
										<Text className="mt-1 text-right font-poppins-semibold text-[10px] leading-[14px] text-[#7B849B]">
											Tap to return
										</Text>
									) : null}
								</View>
							</View>
							<View style={styles.bubbleTail} />
						</TouchableOpacity>
					) : null}
					{shouldShowReadyToFinishPrompt && !isReviewingFinishTarget ? (
						<TouchableOpacity
							accessibilityLabel="Review the last lesson word"
							accessibilityRole="button"
							activeOpacity={0.86}
							style={[
								styles.responseBubble,
								styles.finishPromptBubble,
								isCompactLessonView
									? styles.finishPromptBubbleCompact
									: styles.finishPromptBubbleRegular,
							]}
							onPress={() => setIsReviewingFinishTarget(true)}
						>
							<View className="flex-row items-start gap-3">
								<View style={styles.finishPromptIcon}>
									<Ionicons name="checkmark" size={18} color="#FFFFFF" />
								</View>
								<View className="flex-1">
									<Text className="font-poppins-bold text-[16px] leading-[22px] text-neutral-primary">
										Great work!
									</Text>
									<Text className="mt-1 font-poppins-medium text-[12px] leading-[17px] text-[#58617E]">
										Tap Finish Lesson to continue.
									</Text>
									<Text className="mt-1 font-poppins-semibold text-[10px] leading-[14px] text-[#7B849B]">
										Tap to review the word
									</Text>
								</View>
							</View>
							<View style={styles.bubbleTail} />
						</TouchableOpacity>
					) : null}

					{callError || agentError ? (
						<View style={styles.callErrorCard}>
							<Ionicons name="alert-circle" size={17} color="#FF424B" />
							<Text className="flex-1 font-poppins-semibold text-[11px] leading-[15px] text-[#9C2630]">
								{callError ?? agentError}
							</Text>
						</View>
					) : null}

					<View
						style={[
							styles.liveCaptionsPanel,
							isCompactLessonView && styles.liveCaptionsPanelCompact,
						]}
					>
						<View className="mb-2 flex-row items-center justify-between">
							<View className="flex-row items-center gap-2">
								<Ionicons name="text" size={15} color="#FFFFFF" />
								<Text className="font-poppins-bold text-[11px] leading-[15px] text-white">
									Live captions
								</Text>
							</View>
							<View
								style={[
									styles.captionPulse,
									{ backgroundColor: captionRows.length > 0 ? "#21C16B" : "#A8AFBF" },
								]}
							/>
						</View>
						{captionRows.length > 0 ? (
							captionRows.map((caption) => (
								<View
									key={caption.id}
									style={[styles.captionLine, caption.isInterim && styles.captionLineInterim]}
								>
									<Text
										className={`font-poppins-bold text-[11px] leading-[15px] ${
											caption.speakerKind === "teacher" ? "text-[#B8F7CE]" : "text-[#D8D0FF]"
										}`}
									>
										{caption.speakerLabel}
									</Text>
									<Text
										className="flex-1 font-poppins-semibold text-[12px] leading-[17px] text-white"
										numberOfLines={2}
									>
										{formatCaptionForReading(caption.text)}
									</Text>
								</View>
							))
						) : (
							<Text className="font-poppins-medium text-[12px] leading-[17px] text-white/75">
								{captionError ?? "Captions will appear as soon as someone speaks."}
							</Text>
						)}
					</View>

					<View style={styles.pushToTalkDock}>
						<View style={styles.talkControlRow}>
							<TouchableOpacity
								accessibilityLabel="Open lesson info"
								accessibilityRole="button"
								activeOpacity={0.82}
								style={styles.infoControlButton}
								onPress={() => setIsLessonInfoVisible(true)}
							>
								<Ionicons name="information-circle-outline" size={26} color="#6C4EF5" />
							</TouchableOpacity>
							<TouchableOpacity
								accessibilityHint={pushToTalkHint}
								accessibilityLabel="Hold to talk to the AI teacher"
								accessibilityRole="button"
								accessibilityState={
									!canUsePushToTalk && !isMicOpen ? { disabled: true } : undefined
								}
								activeOpacity={0.9}
								disabled={!canUsePushToTalk && !isMicOpen}
								style={[
									styles.pushToTalkButton,
									isMicOpen && styles.pushToTalkButtonActive,
									(isTeacherThinking || isTeacherTalking || isMicChanging) &&
										styles.pushToTalkButtonWaiting,
									!canUsePushToTalk && !isMicOpen && styles.disabledControlCircle,
								]}
								onPressIn={openPushToTalk}
								onPressOut={closePushToTalk}
							>
								{isTeacherThinking || isMicChanging ? (
									<ActivityIndicator size="large" color="#FFFFFF" />
								) : (
									<Ionicons name={isMicOpen ? "mic" : "mic-outline"} size={42} color="#FFFFFF" />
								)}
							</TouchableOpacity>
							<View style={styles.infoControlSpacer} />
						</View>
						<Text className="mt-3 text-center font-poppins-bold text-[16px] leading-[22px] text-white">
							{pushToTalkLabel}
						</Text>
						<Text className="mt-1 text-center font-poppins-medium text-[11px] leading-[15px] text-white/80">
							{pushToTalkSubLabel}
						</Text>
						{isTeacherThinking ? (
							<TouchableOpacity
								activeOpacity={0.82}
								accessibilityLabel="Cancel waiting for AI teacher response"
								accessibilityRole="button"
								style={styles.cancelResponseButton}
								onPress={cancelAwaitingTeacherResponse}
							>
								<Ionicons name="close" size={16} color="#FFFFFF" />
								<Text className="font-poppins-bold text-[12px] leading-[16px] text-white">
									Cancel
								</Text>
							</TouchableOpacity>
						) : null}
					</View>
				</View>
			</View>

			<Modal
				animationType="fade"
				onRequestClose={() => setIsLessonInfoVisible(false)}
				transparent
				visible={isLessonInfoVisible}
			>
				<View style={styles.modalBackdrop}>
					<View style={styles.lessonInfoModal}>
						<View className="mb-3 flex-row items-center justify-between">
							<View className="flex-1 pr-3">
								<Text className="font-poppins-bold text-[20px] leading-[26px] text-neutral-primary">
									{lesson.title}
								</Text>
								<Text className="mt-1 font-poppins-medium text-[12px] leading-[17px] text-[#64708D]">
									{primaryGoal}
								</Text>
							</View>
							<TouchableOpacity
								accessibilityLabel="Close lesson info"
								accessibilityRole="button"
								activeOpacity={0.75}
								style={styles.modalCloseButton}
								onPress={() => setIsLessonInfoVisible(false)}
							>
								<Ionicons name="close" size={22} color="#0D132B" />
							</TouchableOpacity>
						</View>
						<ScrollView
							contentContainerStyle={styles.lessonInfoContent}
							showsVerticalScrollIndicator={false}
						>
							{teacherTargetItems.map((item, index) => {
								const term = "term" in item ? item.term : item.text;
								const kind = "partOfSpeech" in item ? item.partOfSpeech : "phrase";

								return (
									<View key={item.id} style={styles.lessonInfoTarget}>
										<View className="flex-row items-start justify-between gap-3">
											<View className="flex-1">
												<Text className="font-poppins-bold text-[16px] leading-[22px] text-lingua-purple">
													{index + 1}. {term}
												</Text>
												<Text className="mt-1 font-poppins-bold text-[12px] leading-[17px] text-[#FF8A00]">
													{item.pronunciation}
												</Text>
											</View>
											<View style={styles.lessonInfoKindPill}>
												<Text className="font-poppins-bold text-[9px] uppercase leading-[13px] text-[#6C4EF5]">
													{kind}
												</Text>
											</View>
										</View>
										<Text className="mt-2 font-poppins-semibold text-[13px] leading-[18px] text-[#21C16B]">
											{item.translation}
										</Text>
									</View>
								);
							})}
							<Text className="font-poppins-medium text-[12px] leading-[18px] text-[#64708D]">
								{lesson.aiTeacherPrompt}
							</Text>
						</ScrollView>
					</View>
				</View>
			</Modal>

			<View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
				{tabs.map((tab) => {
					const isActive = tab.label === "Learn";

					return (
						<TouchableOpacity
							key={tab.label}
							accessibilityLabel={`${tab.label} tab`}
							accessibilityRole="button"
							accessibilityState={isActive ? { selected: true } : undefined}
							activeOpacity={0.82}
							className="flex-1 items-center justify-center gap-1 pt-2"
							onPress={() => router.replace(tab.href)}
						>
							<Ionicons
								name={isActive ? tab.activeIcon : tab.icon}
								size={tab.label === "Learn" ? 30 : 28}
								color={isActive ? "#6C4EF5" : "#58617E"}
							/>
							<Text
								className={`text-[12px] leading-[16px] ${
									isActive
										? "font-poppins-bold text-lingua-purple"
										: "font-poppins-medium text-[#58617E]"
								}`}
							>
								{tab.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	screenContent: {
		flex: 1,
		justifyContent: "flex-start",
		paddingHorizontal: 14,
		backgroundColor: "#FFFFFF",
	},
	emptyButton: {
		height: 58,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		backgroundColor: "#6C4EF5",
		paddingHorizontal: 24,
	},
	statusDot: {
		width: 13,
		height: 13,
		borderRadius: 7,
	},
	teacherStage: {
		overflow: "hidden",
		borderRadius: 23,
		backgroundColor: "#DAD5D3",
	},
	stageBackground: {
		position: "absolute",
		width: "100%",
		height: "100%",
		opacity: 0.72,
	},
	stageOverlay: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: "36%",
		backgroundColor: "rgba(56, 48, 55, 0.34)",
	},
	lessonPill: {
		position: "absolute",
		top: 16,
		left: 16,
		zIndex: 4,
		maxWidth: 210,
		borderRadius: 18,
		backgroundColor: "rgba(13, 19, 43, 0.56)",
		paddingHorizontal: 14,
		paddingVertical: 9,
	},
	lessonStatePanel: {
		position: "absolute",
		top: 18,
		right: 16,
		zIndex: 4,
		gap: 8,
		alignItems: "stretch",
	},
	lessonStatePill: {
		minWidth: 112,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.72)",
		borderRadius: 999,
		backgroundColor: "rgba(13, 19, 43, 0.64)",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	lessonStatePillActive: {
		borderColor: "rgba(108, 78, 245, 0.1)",
		backgroundColor: "#6C4EF5",
	},
	lessonProgressPill: {
		minWidth: 156,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.38)",
		borderRadius: 14,
		backgroundColor: "rgba(13, 19, 43, 0.52)",
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	lessonProgressMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	lessonProgressTrack: {
		height: 5,
		marginTop: 6,
		overflow: "hidden",
		borderRadius: 999,
		backgroundColor: "rgba(255, 255, 255, 0.28)",
	},
	lessonProgressFill: {
		height: "100%",
		borderRadius: 999,
		backgroundColor: "#21C16B",
	},
	finishProgressButton: {
		minHeight: 36,
		marginTop: 9,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderRadius: 999,
		backgroundColor: "#21C16B",
		paddingHorizontal: 12,
		paddingVertical: 8,
		boxShadow: "0 10px 20px rgba(33, 193, 107, 0.26)",
	},
	finishProgressButtonDisabled: {
		opacity: 0.72,
	},
	teacherMascot: {
		position: "absolute",
		bottom: 246,
		left: 12,
		zIndex: 4,
		width: 124,
		height: 124,
	},
	teacherMascotCompact: {
		bottom: 194,
		left: 8,
		width: 98,
		height: 98,
	},
	responseBubble: {
		position: "absolute",
		right: 20,
		left: 118,
		minHeight: 96,
		maxHeight: 190,
		zIndex: 3,
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#EEEFF4",
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 22,
		paddingVertical: 18,
		boxShadow: "0 8px 22px rgba(22, 24, 40, 0.14)",
	},
	responseBubbleRegular: {
		bottom: 318,
	},
	responseBubbleCompact: {
		top: 82,
		right: 14,
		left: 94,
		minHeight: 82,
		maxHeight: 118,
		paddingHorizontal: 16,
		paddingVertical: 13,
	},
	bubbleTail: {
		position: "absolute",
		left: -13,
		bottom: 12,
		width: 0,
		height: 0,
		borderTopWidth: 13,
		borderBottomWidth: 13,
		borderRightWidth: 18,
		borderTopColor: "transparent",
		borderBottomColor: "transparent",
		borderRightColor: "#FFFFFF",
	},
	finishPromptBubble: {
		minHeight: 86,
		maxHeight: 108,
		paddingHorizontal: 18,
		paddingVertical: 14,
	},
	finishPromptBubbleRegular: {
		bottom: 318,
	},
	finishPromptBubbleCompact: {
		top: 90,
		right: 14,
		left: 94,
		minHeight: 78,
	},
	finishPromptIcon: {
		width: 34,
		height: 34,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 17,
		backgroundColor: "#21C16B",
	},
	callErrorCard: {
		position: "absolute",
		right: 18,
		bottom: 264,
		left: 18,
		minHeight: 34,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		borderRadius: 14,
		backgroundColor: "rgba(255, 239, 241, 0.95)",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	liveCaptionsPanel: {
		position: "absolute",
		right: 14,
		bottom: 142,
		left: 14,
		minHeight: 96,
		maxHeight: 132,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.2)",
		borderRadius: 18,
		backgroundColor: "rgba(13, 19, 43, 0.72)",
		paddingHorizontal: 13,
		paddingVertical: 11,
	},
	liveCaptionsPanelCompact: {
		bottom: 150,
		minHeight: 58,
		maxHeight: 68,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	captionPulse: {
		width: 9,
		height: 9,
		borderRadius: 5,
	},
	captionLine: {
		flexDirection: "row",
		gap: 9,
		paddingVertical: 2,
	},
	captionLineInterim: {
		opacity: 0.78,
	},
	pushToTalkButton: {
		width: 96,
		height: 96,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 6,
		borderColor: "rgba(255, 255, 255, 0.45)",
		borderRadius: 48,
		backgroundColor: "#6C4EF5",
		boxShadow: "0 12px 26px rgba(108, 78, 245, 0.36)",
	},
	pushToTalkButtonActive: {
		backgroundColor: "#18D313",
		boxShadow: "0 12px 26px rgba(24, 211, 19, 0.32)",
	},
	pushToTalkButtonWaiting: {
		backgroundColor: "#A8AFBF",
		boxShadow: "0 10px 22px rgba(22, 24, 40, 0.18)",
	},
	disabledControlCircle: {
		opacity: 0.58,
	},
	pushToTalkDock: {
		position: "absolute",
		right: 12,
		bottom: 12,
		left: 12,
		alignItems: "center",
	},
	talkControlRow: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	infoControlButton: {
		width: 48,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#E8E5FF",
		borderRadius: 24,
		backgroundColor: "rgba(247, 245, 255, 0.96)",
		boxShadow: "0 8px 18px rgba(22, 24, 40, 0.14)",
	},
	infoControlSpacer: {
		width: 48,
		height: 48,
	},
	cancelResponseButton: {
		marginTop: 10,
		minHeight: 34,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		borderWidth: 1,
		borderColor: "rgba(255, 255, 255, 0.42)",
		borderRadius: 999,
		backgroundColor: "rgba(13, 19, 43, 0.46)",
		paddingHorizontal: 14,
		paddingVertical: 7,
	},
	reviewScreen: {
		flex: 1,
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingTop: 34,
		backgroundColor: "#FFFFFF",
	},
	lessonResultContent: {
		width: "100%",
		alignItems: "center",
		paddingBottom: 22,
	},
	lessonResultScroll: {
		width: "100%",
		flex: 1,
	},
	reviewHero: {
		width: 154,
		height: 154,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 77,
		backgroundColor: "#E9FBF0",
	},
	reviewMascot: {
		width: 130,
		height: 130,
	},
	reviewBadge: {
		position: "absolute",
		right: 6,
		bottom: 10,
		width: 48,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 5,
		borderColor: "#FFFFFF",
		borderRadius: 24,
		backgroundColor: "#6C4EF5",
	},
	reviewCommentCard: {
		width: "100%",
		gap: 12,
		marginTop: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#ECEFF6",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 15,
		paddingVertical: 14,
		boxShadow: "0 8px 24px rgba(22, 24, 40, 0.07)",
	},
	completedScreen: {
		flex: 1,
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingTop: 58,
		backgroundColor: "#FFFFFF",
	},
	completedBackButton: {
		position: "absolute",
		top: 18,
		left: 18,
		width: 48,
		height: 48,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	completedHero: {
		width: 166,
		height: 166,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 83,
		backgroundColor: "#F1EEFF",
	},
	completedMascot: {
		width: 140,
		height: 140,
	},
	completedCheckBadge: {
		position: "absolute",
		right: 8,
		bottom: 12,
		width: 52,
		height: 52,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 5,
		borderColor: "#FFFFFF",
		borderRadius: 26,
		backgroundColor: "#21C16B",
	},
	completedRewardCard: {
		width: "100%",
		marginTop: 0,
		marginBottom: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderWidth: 1,
		borderColor: "#ECEFF6",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 18,
		paddingVertical: 14,
		boxShadow: "0 10px 28px rgba(22, 24, 40, 0.08)",
	},
	completedPrimaryButton: {
		width: "100%",
		height: 58,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		backgroundColor: "#6C4EF5",
		boxShadow: "0 10px 24px rgba(108, 78, 245, 0.24)",
	},
	completedSecondaryButton: {
		width: "100%",
		height: 54,
		marginTop: 0,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		backgroundColor: "#F1EEFF",
	},
	lessonResultActionRow: {
		width: "100%",
		flexDirection: "row",
		gap: 10,
		paddingTop: 12,
		backgroundColor: "#FFFFFF",
	},
	lessonResultActionButton: {
		flex: 1,
		width: "auto",
		height: 54,
		marginTop: 0,
	},
	feedbackColumn: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	feedbackDivider: {
		width: 1,
		height: 46,
		backgroundColor: "#E5E7F1",
	},
	feedbackCard: {
		width: "100%",
		minHeight: 86,
		marginTop: 14,
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 22,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 10,
		boxShadow: "0 10px 28px rgba(22, 24, 40, 0.09)",
	},
	modalBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(13, 19, 43, 0.42)",
		paddingHorizontal: 14,
		paddingBottom: 18,
	},
	lessonInfoModal: {
		maxHeight: "78%",
		borderRadius: 24,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 18,
		paddingTop: 18,
		paddingBottom: 16,
		boxShadow: "0 18px 42px rgba(22, 24, 40, 0.18)",
	},
	modalCloseButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 20,
		backgroundColor: "#F4F6FA",
	},
	lessonInfoContent: {
		gap: 10,
		paddingBottom: 4,
	},
	lessonInfoTarget: {
		borderWidth: 1,
		borderColor: "#ECEFF6",
		borderRadius: 16,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	lessonInfoKindPill: {
		borderRadius: 8,
		backgroundColor: "#F1EEFF",
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	tabBar: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: 96,
		flexDirection: "row",
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#F1F2F7",
		backgroundColor: "#FFFFFF",
	},
});
