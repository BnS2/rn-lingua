import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { useLanguageStore } from "@/store/languageStore";
import { useProgressStore } from "@/store/progressStore";

const profileActions = [
	{ label: "Account settings", icon: "person-circle-outline" },
	{ label: "Learning preferences", icon: "options-outline", href: "/language-selection" },
	{ label: "Notifications", icon: "notifications-outline" },
	{ label: "Help center", icon: "help-circle-outline" },
] as const;

export default function ProfileScreen() {
	const router = useRouter();
	const { signOut } = useAuth();
	const { user } = useUser();
	const selectedLanguageCode = useLanguageStore((state) => state.selectedLanguageCode);
	const activeLanguageCode = selectedLanguageCode ?? "es";
	const { currentXP, streakCount, completedLessonIds } = useProgressStore((state) =>
		state.getProgressForLanguage(activeLanguageCode),
	);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const displayName = user?.fullName || user?.firstName || user?.username || "Language learner";
	const email = user?.primaryEmailAddress?.emailAddress ?? "student@example.com";

	const showDemoMessage = (title: string) => {
		Alert.alert(
			title,
			"This setting is a demo placeholder. It will be connected as the profile feature grows.",
		);
	};

	const handleSignOut = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await signOut();
			router.replace("/onboarding");
		} catch (error) {
			if (__DEV__) {
				console.error("Sign out failed:", error);
			} else {
				console.error("Sign out failed");
			}
			Alert.alert("Sign out failed", "Please try again.");
		} finally {
			setIsSigningOut(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View className="items-center">
					<View className="h-[112px] w-[112px] items-center justify-center rounded-full bg-[#F4F1FF]">
						{user?.imageUrl ? (
							<Image source={{ uri: user.imageUrl }} className="h-[104px] w-[104px] rounded-full" />
						) : (
							<Image
								source={images.mascotLogo}
								className="h-[74px] w-[74px]"
								contentFit="contain"
							/>
						)}
					</View>
					<Text className="mt-4 text-center font-poppins-bold text-[26px] text-neutral-primary">
						{displayName}
					</Text>
					<Text className="mt-1 text-center font-poppins-regular text-[14px] text-neutral-secondary">
						{email}
					</Text>
				</View>

				<View className="mt-7 flex-row gap-3">
					<View className="flex-1 rounded-[20px] bg-[#FFF8EE] px-4 py-4">
						<Text className="font-poppins-bold text-[22px] text-neutral-primary">{currentXP}</Text>
						<Text className="font-poppins-medium text-[12px] text-neutral-secondary">Today XP</Text>
					</View>
					<View className="flex-1 rounded-[20px] bg-[#EEF7F0] px-4 py-4">
						<Text className="font-poppins-bold text-[22px] text-neutral-primary">
							{streakCount}
						</Text>
						<Text className="font-poppins-medium text-[12px] text-neutral-secondary">
							Day streak
						</Text>
					</View>
					<View className="flex-1 rounded-[20px] bg-[#F4F1FF] px-4 py-4">
						<Text className="font-poppins-bold text-[22px] text-neutral-primary">
							{completedLessonIds.length}
						</Text>
						<Text className="font-poppins-medium text-[12px] text-neutral-secondary">Lessons</Text>
					</View>
				</View>

				<View className="mt-7 rounded-[24px] border border-neutral-border bg-white">
					{profileActions.map((action, index) => (
						<TouchableOpacity
							key={action.label}
							activeOpacity={0.82}
							accessibilityLabel={`${action.label} demo`}
							accessibilityRole="button"
							className="flex-row items-center px-4 py-4"
							style={index < profileActions.length - 1 ? styles.actionBorder : null}
							onPress={() =>
								"href" in action ? router.push(action.href) : showDemoMessage(action.label)
							}
						>
							<View className="h-[40px] w-[40px] items-center justify-center rounded-full bg-neutral-surface">
								<Ionicons name={action.icon} size={21} color="#6C4EF5" />
							</View>
							<Text className="ml-3 flex-1 font-poppins-semibold text-[15px] text-neutral-primary">
								{action.label}
							</Text>
							<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
						</TouchableOpacity>
					))}
				</View>

				<TouchableOpacity
					activeOpacity={0.85}
					className="mt-6 h-[54px] w-full flex-row items-center justify-center gap-2 rounded-[18px] bg-[#FF4D4D] px-5"
					disabled={isSigningOut}
					onPress={handleSignOut}
				>
					{isSigningOut ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
					)}
					<Text className="font-poppins-bold text-[16px] text-white">
						{isSigningOut ? "Signing out..." : "Log out"}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 128,
	},
	actionBorder: {
		borderBottomWidth: 1,
		borderBottomColor: "#F1F2F7",
	},
});
