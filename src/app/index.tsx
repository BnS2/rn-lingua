import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguageStore } from "@/store/languageStore";

export default function Index() {
	const { isLoaded, isSignedIn } = useAuth();
	const { hasHydrated, selectedLanguageCode } = useLanguageStore();

	if (!isLoaded || (isSignedIn && !hasHydrated)) {
		return (
			<SafeAreaView style={styles.loadingSafeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<ActivityIndicator size="large" color="#6C4EF5" />
			</SafeAreaView>
		);
	}

	if (!isSignedIn) {
		return <Redirect href="/onboarding" />;
	}

	if (!selectedLanguageCode) {
		return <Redirect href="/language-selection" />;
	}

	return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
	loadingSafeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
});
