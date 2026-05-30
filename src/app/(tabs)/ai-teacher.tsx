import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AiTeacherScreen() {
	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View className="flex-1 items-center justify-center bg-white px-6 pb-28">
				<Text className="font-poppins-bold text-[24px] text-neutral-primary">AI Teacher</Text>
				<Text className="mt-2 text-center font-poppins-regular text-[14px] leading-[22px] text-neutral-secondary">
					AI Teacher screen placeholder
				</Text>
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
