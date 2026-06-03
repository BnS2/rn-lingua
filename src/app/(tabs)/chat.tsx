import { Ionicons } from "@expo/vector-icons";
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
	const showDemoMessage = () => {
		Alert.alert(
			"Chat demo",
			"This chat is a placeholder. The real AI tutor chat will be connected in a later lesson.",
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View className="flex-1 bg-white px-5 pb-28 pt-8">
				<Text className="font-poppins-bold text-[28px] text-neutral-primary">Chat</Text>
				<Text className="mt-1 font-poppins-regular text-[14px] leading-[22px] text-neutral-secondary">
					Demo AI tutor chat
				</Text>

				<View className="mt-8 gap-4">
					<View className="self-start max-w-[86%] rounded-[22px] rounded-bl-[8px] bg-neutral-surface px-4 py-3">
						<Text className="font-poppins-regular text-[14px] leading-[22px] text-neutral-primary">
							Hi! I can help you practice phrases after the chat tutor is connected.
						</Text>
					</View>

					<View className="self-end max-w-[82%] rounded-[22px] rounded-br-[8px] bg-lingua-purple px-4 py-3">
						<Text className="font-poppins-regular text-[14px] leading-[22px] text-white">
							Can we practice ordering coffee?
						</Text>
					</View>

					<View className="self-start max-w-[88%] rounded-[22px] rounded-bl-[8px] bg-[#FFF8EE] px-4 py-3">
						<Text className="font-poppins-semibold text-[13px] text-[#C16A00]">Demo note</Text>
						<Text className="mt-1 font-poppins-regular text-[14px] leading-[22px] text-neutral-primary">
							This is placeholder content for the teaching project. The actual AI chat flow comes
							later.
						</Text>
					</View>
				</View>

				<TouchableOpacity
					activeOpacity={0.86}
					accessibilityLabel="Send demo message"
					accessibilityRole="button"
					className="mt-auto h-[56px] flex-row items-center justify-center gap-2 rounded-[18px] bg-neutral-surface"
					onPress={showDemoMessage}
				>
					<Ionicons name="send-outline" size={20} color="#6C4EF5" />
					<Text className="font-poppins-semibold text-[15px] text-lingua-purple">
						Send demo message
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
