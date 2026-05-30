import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useState } from "react";
import {
	Animated,
	Easing,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabRouteName = "home" | "learn" | "ai-teacher" | "chat" | "profile";

type TabConfig = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
};

const ACTIVE_COLOR = "#6C4EF5";
const INACTIVE_COLOR = "#7B819D";
const TAB_BAR_HORIZONTAL_INSET = 16;
const ACTIVE_CIRCLE_SIZE = 54;

const tabs: Record<TabRouteName, TabConfig> = {
	home: {
		label: "Home",
		icon: "home",
	},
	learn: {
		label: "Learn",
		icon: "book-outline",
	},
	"ai-teacher": {
		label: "AI Teacher",
		icon: "school-outline",
	},
	chat: {
		label: "Chat",
		icon: "chatbubble-outline",
	},
	profile: {
		label: "Profile",
		icon: "person-outline",
	},
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [activeIndex] = useState(() => new Animated.Value(state.index));
	const tabCount = state.routes.length;
	const tabWidth = (width - TAB_BAR_HORIZONTAL_INSET * 2) / tabCount;
	const indicatorOffset = (tabWidth - ACTIVE_CIRCLE_SIZE) / 2;
	const activeRoute = state.routes[state.index];
	const activeTab = tabs[activeRoute.name as TabRouteName];

	useEffect(() => {
		Animated.timing(activeIndex, {
			toValue: state.index,
			useNativeDriver: true,
			duration: 220,
			easing: Easing.out(Easing.cubic),
		}).start();
	}, [activeIndex, state.index]);

	const translateX = activeIndex.interpolate({
		inputRange: state.routes.map((_, index) => index),
		outputRange: state.routes.map((_, index) => index * tabWidth + indicatorOffset),
	});

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
				<Animated.View
					pointerEvents="none"
					style={[
						styles.activeCircle,
						{
							transform: [{ translateX }],
						},
					]}
				>
					<Ionicons name={activeTab.icon} size={25} color="#FFFFFF" />
				</Animated.View>

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
							{!isFocused ? (
								<>
									<Ionicons name={tab.icon} size={27} color={INACTIVE_COLOR} />
									<Text style={styles.label}>{tab.label}</Text>
								</>
							) : null}
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
		backgroundColor: "transparent",
		paddingHorizontal: TAB_BAR_HORIZONTAL_INSET,
	},
	bar: {
		height: 86,
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 30,
		backgroundColor: "#FFFFFF",
		boxShadow: "0 8px 24px rgba(13, 19, 43, 0.10)",
	},
	activeCircle: {
		position: "absolute",
		top: 12,
		width: ACTIVE_CIRCLE_SIZE,
		height: ACTIVE_CIRCLE_SIZE,
		borderRadius: ACTIVE_CIRCLE_SIZE / 2,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: ACTIVE_COLOR,
		boxShadow: "0 8px 16px rgba(108, 78, 245, 0.32)",
	},
	tabButton: {
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingTop: 8,
	},
	label: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 12,
		lineHeight: 16,
		color: INACTIVE_COLOR,
	},
});
