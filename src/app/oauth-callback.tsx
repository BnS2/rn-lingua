import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * CRITICAL: This MUST be called at module-level (outside the component) so
 * that when the OAuth deep link opens this screen, the in-app browser session
 * is immediately closed. This unblocks `startSSOFlow` in signin/signup, which
 * resolves and handles session activation + navigation itself.
 */
WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallback() {
	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#6C4EF5" />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
