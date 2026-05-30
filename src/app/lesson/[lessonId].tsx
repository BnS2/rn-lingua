import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { getLanguageByCode } from "@/data/languages";
import { getLessonById } from "@/data/lessons";

type ControlButton = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	variant?: "danger";
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

const controls: ControlButton[] = [
	{ label: "Audio", icon: "volume-high" },
	{ label: "Mic", icon: "mic" },
	{ label: "Subtitles", icon: "language" },
	{ label: "End Call", icon: "call", variant: "danger" },
];

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
	const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
	const lesson = lessonId ? getLessonById(lessonId) : undefined;
	const language = lesson ? getLanguageByCode(lesson.languageCode) : undefined;

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
							<View className="h-[13px] w-[13px] rounded-full bg-[#18D313]" />
							<Text className="font-poppins-medium text-[17px] leading-[22px] text-[#58617E]">
								Online
							</Text>
						</View>
					</View>

					<View className="flex-row items-center gap-3">
						{[
							{ label: "Audio lesson", icon: "volume-high" as const },
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
							<Text className="font-poppins-bold text-[10px] text-neutral-primary">Audio</Text>
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

					<View style={styles.controlDock}>
						{controls.map((control) => {
							const isDanger = control.variant === "danger";

							return (
								<View key={control.label} className="items-center gap-2">
									<TouchableOpacity
										accessibilityLabel={control.label}
										accessibilityRole="button"
										activeOpacity={0.82}
										style={[styles.controlCircle, isDanger && styles.dangerControlCircle]}
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
		height: "44%",
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
		bottom: 176,
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
	controlDock: {
		position: "absolute",
		right: 12,
		bottom: 22,
		left: 12,
		flexDirection: "row",
		justifyContent: "space-around",
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
