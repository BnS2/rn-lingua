import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomTabBar } from "@/components/custom-tab-bar";
import { useAuthGate } from "@/hooks/useAuthGate";

export default function TabsLayout() {
	const gate = useAuthGate();

	if (gate.status === "loading") {
		return (
			<SafeAreaView style={styles.loadingSafeArea}>
				<ActivityIndicator size="large" color="#6C4EF5" />
			</SafeAreaView>
		);
	}

	if (gate.status === "redirect") {
		return <Redirect href={gate.href} />;
	}

	return (
		<Tabs
			initialRouteName="home"
			screenOptions={{
				headerShown: false,
				tabBarHideOnKeyboard: true,
			}}
			tabBar={(props) => <CustomTabBar {...props} />}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: "Home",
					tabBarAccessibilityLabel: "Home tab",
				}}
			/>
			<Tabs.Screen
				name="learn"
				options={{
					title: "Learn",
					tabBarAccessibilityLabel: "Learn tab",
				}}
			/>
			<Tabs.Screen
				name="ai-teacher"
				options={{
					title: "AI Teacher",
					tabBarAccessibilityLabel: "AI Teacher tab",
				}}
			/>
			<Tabs.Screen
				name="chat"
				options={{
					title: "Chat",
					tabBarAccessibilityLabel: "Chat tab",
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarAccessibilityLabel: "Profile tab",
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	loadingSafeArea: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FFFFFF",
	},
});
