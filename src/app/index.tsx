import { Redirect } from "expo-router";
import { ActivityIndicator, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthGate } from "@/hooks/useAuthGate";

export default function Index() {
	const gate = useAuthGate();

	if (gate.status === "loading") {
		return (
			<SafeAreaView style={styles.loadingSafeArea}>
				<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
				<ActivityIndicator size="large" color="#6C4EF5" />
			</SafeAreaView>
		);
	}

	if (gate.status === "redirect") {
		return <Redirect href={gate.href} />;
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
