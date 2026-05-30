import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabRouteName = "home" | "learn" | "ai-teacher" | "chat" | "profile";

type TabConfig = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	activeIcon: keyof typeof Ionicons.glyphMap;
};

const ACTIVE_COLOR = "#6C4EF5";
const INACTIVE_COLOR = "#58617E";
const TAB_BAR_HORIZONTAL_INSET = 0;

const tabs: Record<TabRouteName, TabConfig> = {
	home: {
		label: "Home",
		icon: "home-outline",
		activeIcon: "home",
	},
	learn: {
		label: "Learn",
		icon: "book-outline",
		activeIcon: "book",
	},
	"ai-teacher": {
		label: "AI Teacher",
		icon: "school-outline",
		activeIcon: "school-outline",
	},
	chat: {
		label: "Chat",
		icon: "chatbubble-outline",
		activeIcon: "chatbubble-outline",
	},
	profile: {
		label: "Profile",
		icon: "person-outline",
		activeIcon: "person-outline",
	},
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const tabCount = state.routes.length;
	const tabWidth = (width - TAB_BAR_HORIZONTAL_INSET * 2) / tabCount;

	return (
		<View
			style={[
				styles.wrapper,
				{
					paddingBottom: Math.max(insets.bottom, 10),
				},
			]}
		>
			<View style={styles.bar}>
				{state.routes.map((route, index) => {
					const tab = tabs[route.name as TabRouteName];
					const options = descriptors[route.key]?.options;
					const isFocused = state.index === index;

					const onPress = () => {
						const event = navigation.emit({
							type: "tabPress",
							target: route.key,
							canPreventDefault: true,
						});

						if (!isFocused && !event.defaultPrevented) {
							navigation.navigate(route.name, route.params);
						}
					};

					return (
						<TouchableOpacity
							key={route.key}
							accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
							accessibilityRole="button"
							accessibilityState={isFocused ? { selected: true } : undefined}
							activeOpacity={0.82}
							onPress={onPress}
							style={[styles.tabButton, { width: tabWidth }]}
						>
							<Ionicons
								name={isFocused ? tab.activeIcon : tab.icon}
								size={index === 1 ? 30 : 29}
								color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
							/>
							<Text style={[styles.label, isFocused && styles.activeLabel]}>{tab.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: "#FFFFFF",
		borderTopWidth: 1,
		borderTopColor: "#F1F2F7",
	},
	bar: {
		height: 76,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
	},
	tabButton: {
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
		gap: 3,
		paddingTop: 6,
	},
	label: {
		fontFamily: "Poppins-Medium",
		fontSize: 13,
		lineHeight: 17,
		color: INACTIVE_COLOR,
	},
	activeLabel: {
		fontFamily: "Poppins-Bold",
		color: ACTIVE_COLOR,
	},
});
