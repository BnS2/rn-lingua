import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import {
	type Call,
	CallingState,
	StreamVideoClient,
	type TokenProvider,
	type User,
} from "@stream-io/video-react-native-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { getLanguageByCode } from "@/data/languages";
import { getLessonById } from "@/data/lessons";
import { getApiUrl } from "@/lib/api";
import { useLanguageStore } from "@/store/languageStore";
import type { StreamAudioCallSession } from "@/types/stream";

type ControlButton = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	variant?: "danger";
	disabled?: boolean;
	onPress: () => void;
};

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

export default function AudioLessonScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
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
	const [activeCall, setActiveCall] = useState<Call | null>(null);
	const [callStatus, setCallStatus] = useState<CallStatus>("idle");
	const [callError, setCallError] = useState<string | null>(null);
	const [agentStatus, setAgentStatus] = useState<AgentConnectionStatus>("idle");
	const [agentError, setAgentError] = useState<string | null>(null);
	const [agentSession, setAgentSession] = useState<VisionAgentSession | null>(null);
	const [isCameraOn, setIsCameraOn] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [showSubtitles, setShowSubtitles] = useState(true);
	const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
	const didAutoStartCall = useRef(false);
	const activeCallRef = useRef<Call | null>(null);
	const agentSessionRef = useRef<VisionAgentSession | null>(null);
	const getTokenRef = useRef(getToken);
	const isMountedRef = useRef(false);
	const streamClientRef = useRef<StreamVideoClient | null>(null);

	const isBusy = callStatus === "creating" || callStatus === "connecting";
	const isJoined = callStatus === "joined";

	useEffect(() => {
		getTokenRef.current = getToken;
	}, [getToken]);

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
	}, []);

	const stopVisibleAgentSession = useCallback(async () => {
		if (!agentSession) {
			return;
		}

		try {
			const clerkToken = await getToken();

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

			setAgentSession(null);
			setAgentStatus("idle");
			setAgentError(null);
		} catch (error) {
			setAgentStatus("failed");
			setAgentError(error instanceof Error ? error.message : "Unable to stop the AI teacher.");
		}
	}, [agentSession, getToken]);

	const cleanupLessonResources = useCallback(async () => {
		await stopAgentSession();

		const currentCall = activeCallRef.current;

		if (currentCall?.state.callingState !== CallingState.LEFT) {
			try {
				await currentCall?.leave();
			} catch (error) {
				console.warn("Failed to leave Stream audio lesson call:", error);
			}
		}

		activeCallRef.current = null;

		const currentClient = streamClientRef.current;

		if (currentClient) {
			try {
				await currentClient.disconnectUser();
			} catch (error) {
				console.warn("Failed to disconnect Stream audio lesson client:", error);
			}
		}

		streamClientRef.current = null;
	}, [stopAgentSession]);

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
		(session: StreamAudioCallSession) => {
			if (streamClient) {
				return streamClient;
			}

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
		[requestStreamToken, streamClient],
	);

	const startAgentSession = useCallback(
		async (session: StreamAudioCallSession) => {
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
					activeCallRef.current?.state.callingState === CallingState.LEFT
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
			}
		},
		[getToken],
	);

	const startOrJoinCall = useCallback(async () => {
		if (isBusy || isJoined) {
			return;
		}

		setCallStatus("creating");
		setCallError(null);

		try {
			const session = await requestCallSession();
			const streamClient = getLessonStreamClient(session);
			setCallStatus("connecting");

			const call = streamClient.call(session.callType, session.callId, { reuseInstance: true });
			call.setDisconnectionTimeout(120);
			activeCallRef.current = call;
			setActiveCall(call);

			await call.join({ create: true });
			await call.camera.disable();
			await call.microphone.enable();

			setIsCameraOn(false);
			setIsMuted(false);
			setCallStatus("joined");
			await startAgentSession(session);
		} catch (error) {
			setCallStatus("error");
			setCallError(error instanceof Error ? error.message : "Unable to join the audio lesson.");
		}
	}, [getLessonStreamClient, isBusy, isJoined, requestCallSession, startAgentSession]);

	useEffect(() => {
		if (didAutoStartCall.current || !lesson || !language || !isAuthLoaded || !userId) {
			return;
		}

		didAutoStartCall.current = true;
		startOrJoinCall();
	}, [isAuthLoaded, language, lesson, startOrJoinCall, userId]);

	const toggleCamera = useCallback(async () => {
		if (!activeCall || !isJoined) {
			return;
		}

		try {
			if (isCameraOn) {
				await activeCall.camera.disable();
				setIsCameraOn(false);
				return;
			}

			await activeCall.camera.enable();
			setIsCameraOn(true);
		} catch (error) {
			setCallStatus("error");
			setCallError(error instanceof Error ? error.message : "Unable to update camera.");
		}
	}, [activeCall, isCameraOn, isJoined]);

	const toggleMute = useCallback(async () => {
		if (!activeCall || !isJoined) {
			return;
		}

		try {
			if (isMuted) {
				await activeCall.microphone.enable();
				setIsMuted(false);
				return;
			}

			await activeCall.microphone.disable();
			setIsMuted(true);
		} catch (error) {
			setCallStatus("error");
			setCallError(error instanceof Error ? error.message : "Unable to update microphone.");
		}
	}, [activeCall, isJoined, isMuted]);

	const toggleSubtitles = useCallback(() => {
		setShowSubtitles((currentValue) => !currentValue);
	}, []);

	const endCall = useCallback(async () => {
		if (!activeCall) {
			setCallStatus("ended");
			router.replace("/(tabs)/learn");
			return;
		}

		try {
			await stopVisibleAgentSession();

			if (activeCall.state.callingState !== CallingState.LEFT) {
				await activeCall.leave();
			}
			setActiveCall(null);
			setIsCameraOn(false);
			setIsMuted(false);
			setCallStatus("ended");
			router.replace("/(tabs)/learn");
		} catch (error) {
			setCallStatus("error");
			setCallError(error instanceof Error ? error.message : "Unable to end the audio lesson.");
		}
	}, [activeCall, router, stopVisibleAgentSession]);

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

	const primaryGoal = lesson.goals[0]?.text ?? lesson.description;
	const firstPhrase = lesson.phrases[0];
	const secondPhrase = lesson.phrases[1];
	const teacherBubbleTitle =
		language?.code === "es" ? "Muy bien!" : language?.code === "fr" ? "Tres bien!" : "Great job!";
	const activePhrase = firstPhrase?.text ?? lesson.title;
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
			? "AI teacher connecting"
			: agentStatus === "connected"
				? "AI teacher connected"
				: agentStatus === "failed"
					? "AI teacher failed"
					: "AI teacher idle";
	const agentStatusDotColor =
		agentStatus === "connected"
			? "#18D313"
			: agentStatus === "connecting"
				? "#FFB020"
				: agentStatus === "failed"
					? "#FF424B"
					: "#A8AFBF";
	const renderControl = (control: ControlButton) => {
		const isDanger = control.variant === "danger";
		const isDisabled = control.disabled;

		return (
			<View key={control.label} style={styles.controlItem}>
				<TouchableOpacity
					accessibilityLabel={control.label}
					accessibilityRole="button"
					accessibilityState={isDisabled ? { disabled: true } : undefined}
					activeOpacity={0.82}
					disabled={isDisabled}
					style={[
						styles.controlCircle,
						isDanger && styles.dangerControlCircle,
						isDisabled && styles.disabledControlCircle,
					]}
					onPress={control.onPress}
				>
					<Ionicons
						name={control.icon}
						size={isDanger ? 34 : 31}
						color={isDanger ? "#FFFFFF" : "#06133D"}
					/>
				</TouchableOpacity>
				<Text className="font-poppins-bold text-[14px] leading-[18px] text-white">
					{control.label}
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 112 + insets.bottom }]}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View className="flex-row items-center pb-4 pt-2">
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
						<View className="mt-1 flex-row items-center gap-2">
							<View style={[styles.callStatusDot, { backgroundColor: callStatusDotColor }]} />
							<Text className="font-poppins-medium text-[17px] leading-[22px] text-[#58617E]">
								{callStatusLabel}
							</Text>
						</View>
						<View className="mt-1 flex-row items-center gap-2">
							<View style={[styles.agentStatusDot, { backgroundColor: agentStatusDotColor }]} />
							<Text className="font-poppins-medium text-[12px] leading-[16px] text-[#7B849B]">
								{agentStatusLabel}
							</Text>
						</View>
					</View>

					<View className="flex-row items-center gap-3">
						{[
							{ label: "Video lesson", icon: "videocam" as const },
							{ label: "Session minutes", text: String(lesson.estimatedMinutes * 2) },
							{ label: "Notifications", icon: "notifications-outline" as const },
						].map((item) => (
							<TouchableOpacity
								key={item.label}
								accessibilityLabel={item.label}
								accessibilityRole="button"
								activeOpacity={0.82}
								style={styles.headerAction}
							>
								{"icon" in item ? (
									<Ionicons name={item.icon} size={25} color="#06133D" />
								) : (
									<Text
										className="font-poppins-bold text-[21px] text-neutral-primary"
										style={styles.headerActionText}
									>
										{item.text}
									</Text>
								)}
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View style={styles.teacherStage}>
					<Image source={images.lessonCafeHero} style={styles.stageBackground} contentFit="cover" />
					<View style={styles.stageOverlay} />

					<View style={styles.lessonPill}>
						<Text className="font-poppins-bold text-[14px] leading-[18px] text-white">
							{language?.name ?? lesson.languageCode.toUpperCase()}
						</Text>
						<Text className="font-poppins-medium text-[11px] leading-[15px] text-white/90">
							{lesson.title}
						</Text>
					</View>

					<View style={styles.previewCard}>
						<Image source={images.mascotLogo} style={styles.previewMascot} contentFit="contain" />
						<View style={styles.previewStatus}>
							<Ionicons name="radio" size={13} color="#21C16B" />
							<Text className="font-poppins-bold text-[10px] text-neutral-primary">
								{isMuted ? "Muted" : "Audio"}
							</Text>
						</View>
					</View>

					<Image source={images.mascotWelcome} style={styles.teacherMascot} contentFit="contain" />

					<View style={styles.responseBubble}>
						<View className="flex-1">
							<Text className="font-poppins-bold text-[24px] leading-[31px] text-neutral-primary">
								{teacherBubbleTitle}
							</Text>
							<Text
								className="mt-1 font-poppins-semibold text-[19px] leading-[25px] text-neutral-primary"
								numberOfLines={1}
							>
								Say: {activePhrase}
							</Text>
							<Text className="mt-1 font-poppins-regular text-[12px] leading-[17px] text-[#64708D]">
								{firstPhrase?.translation ?? lesson.aiTeacherPrompt}
							</Text>
						</View>
						<Ionicons name="volume-high" size={35} color="#5B3BF6" />
						<View style={styles.bubbleTail} />
					</View>

					{callError || agentError ? (
						<View style={styles.callErrorCard}>
							<Ionicons name="alert-circle" size={17} color="#FF424B" />
							<Text className="flex-1 font-poppins-semibold text-[11px] leading-[15px] text-[#9C2630]">
								{callError ?? agentError}
							</Text>
						</View>
					) : null}

					<View style={styles.controlDock}>
						{renderControl({
							label: "Camera",
							icon: "videocam",
							disabled: !isJoined,
							onPress: toggleCamera,
						})}
						{renderControl({
							label: "Mic",
							icon: isMuted ? "mic-off" : "mic",
							disabled: !isJoined,
							onPress: toggleMute,
						})}
						{renderControl({
							label: "Subtitles",
							icon: showSubtitles ? "language" : "text-outline",
							onPress: toggleSubtitles,
						})}
						{renderControl({
							label: "End Call",
							icon: "call",
							variant: "danger",
							onPress: endCall,
						})}
					</View>
				</View>

				<View style={styles.feedbackCard}>
					<View style={styles.feedbackColumn}>
						<Text className="text-center font-poppins-bold text-[14px] leading-[20px] text-neutral-primary">
							Speaking
						</Text>
						<Text className="mt-2 text-center font-poppins-bold text-[15px] leading-[21px] text-[#19CC33]">
							Excellent
						</Text>
					</View>
					<View style={styles.feedbackDivider} />
					<View style={styles.feedbackColumn}>
						<Text className="text-center font-poppins-bold text-[14px] leading-[20px] text-neutral-primary">
							Pronunciation
						</Text>
						<Text className="mt-2 text-center font-poppins-bold text-[15px] leading-[21px] text-[#168BFF]">
							Great
						</Text>
					</View>
					<View style={styles.feedbackDivider} />
					<View style={styles.feedbackColumn}>
						<Text className="text-center font-poppins-bold text-[14px] leading-[20px] text-neutral-primary">
							Grammar
						</Text>
						<Text className="mt-2 text-center font-poppins-bold text-[15px] leading-[21px] text-[#654BFF]">
							Good
						</Text>
					</View>
				</View>

				<View style={styles.lessonContextCard}>
					<Text className="font-poppins-bold text-[14px] leading-[20px] text-neutral-primary">
						{primaryGoal}
					</Text>
					<View className="mt-3 flex-row flex-wrap gap-2">
						{[firstPhrase, secondPhrase].filter(Boolean).map((phrase) => (
							<View key={phrase.id} className="rounded-full bg-[#F1EEFF] px-3 py-2">
								<Text className="font-poppins-semibold text-[12px] leading-[16px] text-lingua-purple">
									{phrase.text}
								</Text>
							</View>
						))}
					</View>
					<Text className="mt-3 font-poppins-regular text-[11px] leading-[16px] text-[#64708D]">
						{lesson.aiTeacherPrompt}
					</Text>
				</View>
			</ScrollView>

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
	scrollContent: {
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
	headerAction: {
		width: 51,
		height: 51,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "#EEF0F7",
		borderRadius: 26,
		backgroundColor: "#FFFFFF",
	},
	headerActionText: {
		lineHeight: 51,
		includeFontPadding: false,
		textAlign: "center",
	},
	callStatusDot: {
		width: 13,
		height: 13,
		borderRadius: 7,
	},
	agentStatusDot: {
		width: 9,
		height: 9,
		borderRadius: 5,
	},
	teacherStage: {
		height: 504,
		overflow: "hidden",
		borderRadius: 23,
		backgroundColor: "#DAD5D3",
	},
	stageBackground: {
		position: "absolute",
		width: "100%",
		height: "100%",
		opacity: 0.55,
	},
	stageOverlay: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: "33%",
		backgroundColor: "rgba(56, 48, 55, 0.34)",
	},
	lessonPill: {
		position: "absolute",
		top: 16,
		left: 16,
		maxWidth: 190,
		borderRadius: 18,
		backgroundColor: "rgba(13, 19, 43, 0.56)",
		paddingHorizontal: 14,
		paddingVertical: 9,
	},
	previewCard: {
		position: "absolute",
		top: 23,
		right: 20,
		width: 111,
		height: 143,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		borderWidth: 3,
		borderColor: "#FFFFFF",
		borderRadius: 23,
		backgroundColor: "rgba(255, 255, 255, 0.82)",
	},
	previewMascot: {
		width: 96,
		height: 96,
	},
	previewStatus: {
		position: "absolute",
		right: 8,
		bottom: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 7,
		paddingVertical: 3,
	},
	teacherMascot: {
		position: "absolute",
		bottom: 144,
		left: -6,
		width: 298,
		height: 298,
	},
	responseBubble: {
		position: "absolute",
		right: 72,
		bottom: 190,
		left: 54,
		minHeight: 118,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderWidth: 1,
		borderColor: "#EEEFF4",
		borderRadius: 20,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 20,
		paddingVertical: 15,
		boxShadow: "0 8px 22px rgba(22, 24, 40, 0.14)",
	},
	bubbleTail: {
		position: "absolute",
		right: 18,
		bottom: -23,
		width: 0,
		height: 0,
		borderTopWidth: 24,
		borderLeftWidth: 24,
		borderTopColor: "#FFFFFF",
		borderLeftColor: "transparent",
	},
	callErrorCard: {
		position: "absolute",
		right: 18,
		bottom: 124,
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
	controlCircle: {
		width: 72,
		height: 72,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 36,
		backgroundColor: "#FFFFFF",
		boxShadow: "0 8px 18px rgba(22, 24, 40, 0.08)",
	},
	dangerControlCircle: {
		backgroundColor: "#FF424B",
	},
	disabledControlCircle: {
		opacity: 0.58,
	},
	controlItem: {
		flex: 1,
		alignItems: "center",
		gap: 5,
	},
	controlDock: {
		position: "absolute",
		right: 12,
		bottom: 34,
		left: 12,
		flexDirection: "row",
	},
	feedbackColumn: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 6,
	},
	feedbackDivider: {
		width: 1,
		height: 60,
		backgroundColor: "#E5E7F1",
	},
	feedbackCard: {
		minHeight: 105,
		marginTop: 16,
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 22,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 14,
		boxShadow: "0 10px 28px rgba(22, 24, 40, 0.09)",
	},
	lessonContextCard: {
		marginTop: 12,
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		padding: 16,
		boxShadow: "0 8px 24px rgba(22, 24, 40, 0.07)",
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
