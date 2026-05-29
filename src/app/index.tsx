import { useAuth, useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import {
	ActivityIndicator,
	Image,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";

export default function Index() {
	const { isLoaded, isSignedIn } = useAuth();
	const { signOut } = useClerk();
	const { user } = useUser();

	// Loading state
	if (!isLoaded) {
		return (
			<SafeAreaView style={styles.loadingSafeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<ActivityIndicator size="large" color="#6C4EF5" />
			</SafeAreaView>
		);
	}

	// Redirection logic if not authenticated
	if (!isSignedIn) {
		return <Redirect href={"/onboarding" as any} />;
	}

	const userEmail = user?.emailAddresses[0]?.emailAddress || "Learner";

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			{/* Custom Top Navigation Bar */}
			<View className="w-full flex-row items-center justify-between px-6 py-3 border-b border-neutral-border bg-white">
				<View className="flex-row items-center gap-2">
					<Image
						source={images.mascotLogo}
						style={{ width: 26, height: 26 }}
						resizeMode="contain"
					/>
					<Text className="text-[18px] text-neutral-primary font-poppins-bold tracking-tight">
						muolingo
					</Text>
				</View>

				{/* Stats (Streak & XP) */}
				<View className="flex-row items-center gap-4">
					{/* Streak */}
					<View className="flex-row items-center gap-1 bg-[#FFF8E6] border border-[#FFE0A3] px-3 py-1.5 rounded-full">
						<Image
							source={images.streakFire}
							style={{ width: 16, height: 16 }}
							resizeMode="contain"
						/>
						<Text className="text-[12px] font-poppins-bold text-[#FF8A00]">3</Text>
					</View>

					{/* XP */}
					<View className="flex-row items-center gap-1 bg-[#EEECFF] border border-[#D9D4FF] px-3 py-1.5 rounded-full">
						<Ionicons name="flash" size={14} color="#6C4EF5" />
						<Text className="text-[12px] font-poppins-bold text-lingua-purple">120 XP</Text>
					</View>
				</View>
			</View>

			{/* Main Content Area */}
			<View className="flex-1 px-6 justify-between py-8 bg-white">
				{/* Welcome & Mascot Card Section */}
				<View className="items-center mt-4">
					{/* Tactile Playful Card */}
					<View className="w-full bg-[#F3F0FF] border-2 border-lingua-purple/20 rounded-3xl p-6 items-center shadow-sm relative mb-6">
						{/* Mascot Welcoming */}
						<Image
							source={images.mascotWelcome}
							style={{ width: 180, height: 180 }}
							resizeMode="contain"
						/>

						{/* Greeting Bubble */}
						<View className="bg-white rounded-2xl px-5 py-3 border border-neutral-border mt-4 w-full shadow-sm">
							<Text className="text-h3 text-neutral-primary font-poppins-bold text-center">
								Welcome back!
							</Text>
							<Text className="text-caption text-neutral-secondary font-poppins-medium text-center mt-1 leading-[18px]">
								{userEmail}
							</Text>
						</View>
					</View>

					{/* Short Motivation */}
					<Text className="text-body-large text-neutral-primary font-poppins-bold text-center mt-2 leading-[24px]">
						Ready to learn a new language? 🚀
					</Text>
					<Text className="text-caption text-neutral-secondary text-center font-poppins-regular mt-1 leading-[20px] px-6">
						Real-time AI conversation and personalized lessons are waiting for you. Let{"'"}s make
						today count!
					</Text>
				</View>

				{/* Primary & Sign Out Actions */}
				<View className="w-full gap-4 mb-4">
					{/* Start AI Lesson CTA */}
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-lingua-purple border-b-4 border-lingua-deep-purple rounded-2xl py-4 items-center justify-center shadow-sm"
						onPress={() => alert("AI Teacher lessons are unlocked! Under development ⚡")}
					>
						<Text className="text-white text-center font-poppins-bold text-[16px] tracking-wider uppercase">
							Start AI Lesson
						</Text>
					</TouchableOpacity>

					{/* Sign Out Button (Tactile Gray Style) */}
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-[#F3F4F6] border border-b-4 border-neutral-border rounded-2xl py-3.5 items-center justify-center"
						onPress={() => signOut()}
					>
						<Text className="text-[#EF4444] text-center font-poppins-bold text-[14px] tracking-wide uppercase">
							Sign Out
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
}

// StyleSheet utilized for components covered by React Native exception rules (SafeAreaView)
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	// Separate style for the loading screen — SafeAreaView ignores NativeWind className
	loadingSafeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
});
