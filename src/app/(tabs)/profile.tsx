import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
	const router = useRouter();
	const { signOut } = useAuth();
	const [isSigningOut, setIsSigningOut] = useState(false);

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
			<View className="flex-1 items-center justify-center bg-white px-6 pb-28">
				<Text className="font-poppins-bold text-[24px] text-neutral-primary">Profile</Text>
				<Text className="mt-2 text-center font-poppins-regular text-[14px] leading-[22px] text-neutral-secondary">
					Profile screen placeholder
				</Text>

				<TouchableOpacity
					activeOpacity={0.85}
					className="mt-8 h-[54px] w-full flex-row items-center justify-center gap-2 rounded-[18px] bg-[#FF4D4D] px-5"
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
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
});
