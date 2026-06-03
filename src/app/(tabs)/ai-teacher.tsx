import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";

export default function AiTeacherScreen() {
	const router = useRouter();

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
			<View className="flex-1 bg-white px-6 pb-28 pt-8">
				<View className="items-center rounded-[28px] bg-[#F4F1FF] px-5 py-8">
					<View className="h-[112px] w-[112px] items-center justify-center rounded-full bg-white">
						<Image source={images.mascotLogo} className="h-[78px] w-[78px]" contentFit="contain" />
					</View>
					<Text className="mt-5 text-center font-poppins-bold text-[26px] text-neutral-primary">
						AI Teacher
					</Text>
					<Text className="mt-2 text-center font-poppins-regular text-[14px] leading-[22px] text-neutral-secondary">
						The AI teacher works best inside a lesson, where it has the vocabulary and goals it
						should teach.
					</Text>
				</View>

				<View className="mt-6 gap-3">
					<View className="flex-row items-start gap-3 rounded-[20px] border border-neutral-border bg-white px-4 py-4">
						<View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#EEF7F0]">
							<Ionicons name="book-outline" size={20} color="#21C16B" />
						</View>
						<View className="flex-1">
							<Text className="font-poppins-semibold text-[15px] text-neutral-primary">
								Start from Learn
							</Text>
							<Text className="mt-1 font-poppins-regular text-[13px] leading-[20px] text-neutral-secondary">
								Tap a lesson to launch the guided AI teacher experience with the right context.
							</Text>
						</View>
					</View>

					<View className="flex-row items-start gap-3 rounded-[20px] border border-neutral-border bg-white px-4 py-4">
						<View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF8EE]">
							<Ionicons name="sparkles-outline" size={20} color="#FF8A00" />
						</View>
						<View className="flex-1">
							<Text className="font-poppins-semibold text-[15px] text-neutral-primary">
								Demo tab
							</Text>
							<Text className="mt-1 font-poppins-regular text-[13px] leading-[20px] text-neutral-secondary">
								This tab is a lightweight placeholder while lesson-based teaching is the main flow.
							</Text>
						</View>
					</View>
				</View>

				<TouchableOpacity
					activeOpacity={0.86}
					accessibilityLabel="Go to lessons"
					accessibilityRole="button"
					className="mt-6 h-[56px] flex-row items-center justify-center gap-2 rounded-[18px] bg-lingua-purple"
					onPress={() => router.push("/(tabs)/learn")}
				>
					<Ionicons name="book" size={21} color="#FFFFFF" />
					<Text className="font-poppins-bold text-[16px] text-white">Choose a lesson</Text>
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
