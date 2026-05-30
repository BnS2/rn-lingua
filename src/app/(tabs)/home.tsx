import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { getLanguageByCode } from "@/data/languages";
import { nextUpItem, todaysPlan } from "@/data/todaysPlan";
import { getUnitsByLanguage } from "@/data/units";
import { useLanguageStore } from "@/store/languageStore";
import { useProgressStore } from "@/store/progressStore";

// ------------------------------------------------------------------
// Plan item icon config
// ------------------------------------------------------------------
const PLAN_ICON_CONFIG = {
	lesson: { icon: "book", bg: "#6C4EF5" },
	"ai-conversation": { icon: "headset", bg: "#6C4EF5" },
	vocabulary: { icon: "chatbubble-ellipses", bg: "#FF6B6B" },
	"ai-video-call": { icon: "videocam", bg: "#21C16B" },
} as const;

// ------------------------------------------------------------------
// Greeting helper
// ------------------------------------------------------------------
function getGreetingWord(languageCode: string | null): string {
	switch (languageCode) {
		case "es":
			return "Hola";
		case "fr":
			return "Bonjour";
		case "ja":
			return "Konnichiwa";
		default:
			return "Hello";
	}
}

// ------------------------------------------------------------------
// Home screen
// ------------------------------------------------------------------
export default function HomeScreen() {
	const { user } = useUser();
	const router = useRouter();
	const selectedLanguageCode = useLanguageStore((s) => s.selectedLanguageCode);
	const { currentXP, dailyGoalXP, streakCount } = useProgressStore();

	const language = selectedLanguageCode ? getLanguageByCode(selectedLanguageCode) : null;
	const units = selectedLanguageCode ? getUnitsByLanguage(selectedLanguageCode) : [];
	const currentUnit = units[0];

	const firstName = user?.firstName ?? user?.username ?? "Friend";
	const greeting = getGreetingWord(selectedLanguageCode);
	const xpProgress = Math.min(currentXP / dailyGoalXP, 1);

	const handleContinue = useCallback(() => {
		// Navigate to learn tab when lesson routing is ready
		router.push("/(tabs)/learn");
	}, [router]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				{/* ── Header ─────────────────────────────────────────── */}
				<View className="flex-row items-center px-5 pb-4 pt-2">
					{/* Flag + greeting */}
					<View className="flex-1 flex-row items-center gap-3">
						{language ? (
							<Image
								source={{ uri: language.flagUrl }}
								style={styles.flagIcon}
								contentFit="cover"
							/>
						) : (
							<View style={styles.flagPlaceholder}>
								<Ionicons name="earth" size={22} color="#6C4EF5" />
							</View>
						)}
						<Text className="font-poppins-bold text-[18px] text-neutral-primary">
							{greeting}, {firstName}! 👋
						</Text>
					</View>

					{/* Streak + bell */}
					<View className="flex-row items-center gap-3">
						<View className="flex-row items-center gap-1">
							<Image source={images.streakFire} style={styles.streakIcon} contentFit="contain" />
							<Text className="font-poppins-bold text-[16px] text-neutral-primary">
								{streakCount}
							</Text>
						</View>
						<TouchableOpacity
							accessibilityLabel="Notifications"
							accessibilityRole="button"
							style={styles.bellButton}
						>
							<Ionicons name="notifications-outline" size={22} color="#0D132B" />
						</TouchableOpacity>
					</View>
				</View>

				{/* ── Daily Goal Card ──────────────────────────────────── */}
				<View className="mx-5 mb-4">
					<View style={styles.dailyGoalCard}>
						{/* Left: text + progress */}
						<View className="flex-1 pr-4">
							<Text className="font-poppins-medium text-[13px] text-neutral-secondary">
								Daily goal
							</Text>
							<View className="mt-1 flex-row items-baseline gap-1">
								<Text className="font-poppins-bold text-[36px] text-neutral-primary leading-[44px]">
									{currentXP}
								</Text>
								<Text className="font-poppins-regular text-[14px] text-neutral-secondary">
									/ {dailyGoalXP} XP
								</Text>
							</View>
							{/* Progress bar */}
							<View style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${xpProgress * 100}%` }]} />
							</View>
						</View>
						{/* Right: treasure chest */}
						<Image source={images.treasure} style={styles.treasureImage} contentFit="contain" />
					</View>
				</View>

				{/* ── Continue Learning Card ───────────────────────────── */}
				<View className="mx-5 mb-5">
					<View style={styles.continueLearningCard}>
						{/* Text content */}
						<View className="flex-1 pr-4">
							<Text
								className="font-poppins-regular text-[13px]"
								style={styles.continueLearningSubtitle}
							>
								Continue learning
							</Text>
							<Text
								className="font-poppins-bold text-[28px] leading-[34px]"
								style={styles.continueLearningTitle}
							>
								{language?.name ?? "Spanish"}
							</Text>
							<Text
								className="font-poppins-medium text-[13px] mt-0.5 mb-4"
								style={styles.continueLearningSubtitle}
							>
								{language?.code?.toUpperCase() ?? "A1"} •{" "}
								{currentUnit ? currentUnit.title.replace(/\s*Basics\s*/i, "Unit ") : "Unit 1"}
							</Text>
							<TouchableOpacity
								onPress={handleContinue}
								style={styles.continueButton}
								accessibilityLabel="Continue learning"
								accessibilityRole="button"
							>
								<Text style={styles.continueButtonText}>Continue</Text>
							</TouchableOpacity>
						</View>
						{/* Palace illustration */}
						<Image source={images.palace} style={styles.palaceImage} contentFit="contain" />
					</View>
				</View>

				{/* ── Today's Plan ─────────────────────────────────────── */}
				<View className="mx-5 mb-4">
					<View className="mb-3 flex-row items-center justify-between">
						<Text className="font-poppins-bold text-[17px] text-neutral-primary">
							Today&apos;s plan
						</Text>
						<TouchableOpacity accessibilityLabel="View all plan items" accessibilityRole="button">
							<Text className="font-poppins-semibold text-[14px] text-lingua-purple">View all</Text>
						</TouchableOpacity>
					</View>

					{todaysPlan.map((item, index) => {
						const cfg = PLAN_ICON_CONFIG[item.kind];
						return (
							<View
								key={item.id}
								className="flex-row items-center py-3"
								style={[index < todaysPlan.length - 1 && styles.planItemBorder]}
							>
								{/* Icon */}
								<View style={[styles.planIconWrapper, { backgroundColor: cfg.bg }]}>
									<Ionicons
										name={cfg.icon as keyof typeof Ionicons.glyphMap}
										size={20}
										color="#FFFFFF"
									/>
								</View>
								{/* Labels */}
								<View className="flex-1 ml-3">
									<Text className="font-poppins-semibold text-[15px] text-neutral-primary">
										{item.title}
									</Text>
									<Text className="font-poppins-regular text-[13px] text-neutral-secondary">
										{item.subtitle}
									</Text>
								</View>
								{/* Completion indicator */}
								{item.completed ? (
									<View style={styles.completedCircle}>
										<Ionicons name="checkmark" size={16} color="#FFFFFF" />
									</View>
								) : (
									<View style={styles.emptyCircle} />
								)}
							</View>
						);
					})}
				</View>

				{/* ── Next Up Card ─────────────────────────────────────── */}
				<View className="mx-5 mb-6">
					<View style={styles.nextUpCard}>
						{/* Text */}
						<View className="flex-1">
							<Text className="font-poppins-regular text-[12px] text-neutral-secondary">
								{nextUpItem.label}
							</Text>
							<Text className="font-poppins-bold text-[17px] text-neutral-primary mt-0.5">
								{nextUpItem.title}
							</Text>
							<Text className="font-poppins-regular text-[13px] text-neutral-secondary mt-0.5">
								{nextUpItem.subtitle}
							</Text>
						</View>
						{/* Avatar + action button */}
						<View className="flex-row items-center gap-3">
							<Image
								source={{ uri: nextUpItem.avatarUrl }}
								style={styles.avatarImage}
								contentFit="cover"
							/>
							<TouchableOpacity
								style={styles.videoCallButton}
								accessibilityLabel="Start AI Video Call"
								accessibilityRole="button"
							>
								<Ionicons name="videocam" size={20} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		paddingBottom: 110, // space above custom tab bar
	},
	// Header
	flagIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		borderWidth: 2,
		borderColor: "#E5E7EB",
	},
	flagPlaceholder: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: "#F6F7FB",
		alignItems: "center",
		justifyContent: "center",
	},
	streakIcon: {
		width: 22,
		height: 22,
	},
	bellButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: "#F6F7FB",
		alignItems: "center",
		justifyContent: "center",
	},
	// Daily goal
	dailyGoalCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFF8EE",
		borderRadius: 20,
		padding: 20,
		shadowColor: "#0D132B",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 3,
	},
	progressTrack: {
		marginTop: 10,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#F0E4C8",
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 4,
		backgroundColor: "#FF8A00",
	},
	treasureImage: {
		width: 80,
		height: 80,
	},
	// Continue learning
	continueLearningCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 24,
		padding: 24,
		overflow: "hidden",
		backgroundColor: "#6C4EF5",
		shadowColor: "#6C4EF5",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.32,
		shadowRadius: 16,
		elevation: 6,
	},
	continueLearningSubtitle: {
		color: "rgba(255,255,255,0.82)",
	},
	continueLearningTitle: {
		color: "#FFFFFF",
	},
	continueButton: {
		alignSelf: "flex-start",
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		paddingHorizontal: 22,
		paddingVertical: 10,
	},
	continueButtonText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 14,
		color: "#6C4EF5",
	},
	palaceImage: {
		width: 110,
		height: 130,
		marginBottom: -24,
		marginRight: -8,
	},
	// Today's plan
	planIconWrapper: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	planItemBorder: {
		borderBottomWidth: 1,
		borderBottomColor: "#F3F4F6",
	},
	completedCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#6C4EF5",
		alignItems: "center",
		justifyContent: "center",
	},
	emptyCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: "#D1D5DB",
	},
	// Next up
	nextUpCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#EEF7F0",
		borderRadius: 20,
		padding: 20,
		shadowColor: "#0D132B",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
	},
	avatarImage: {
		width: 56,
		height: 56,
		borderRadius: 28,
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	videoCallButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#21C16B",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#21C16B",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.32,
		shadowRadius: 8,
		elevation: 4,
	},
});
