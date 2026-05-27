import { useRouter } from "expo-router";
import { Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";

export default function Index() {
	const router = useRouter();

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<View className="flex-1 justify-between px-6 py-6">
				{/* Top Header Section - Brand Logo & Name */}
				<View className="flex-row items-center justify-center gap-2 mt-4">
					<Image
						source={images.mascotLogo}
						style={{ width: 28, height: 28 }}
						resizeMode="contain"
					/>
					<Text className="text-h3 text-neutral-primary font-poppins-bold tracking-tight">
						muolingo
					</Text>
				</View>

				{/* Heading & Subtitle Section */}
				<View className="items-center mt-6">
					<Text className="text-[34px] font-poppins-bold text-neutral-primary text-center leading-[42px]">
						Your AI language{"\n"}
						<Text className="text-lingua-purple">teacher.</Text>
					</Text>
					<Text className="text-[15px] font-poppins-regular text-neutral-secondary text-center mt-4 leading-[22px] px-2">
						Real conversations, personalized{"\n"}lessons, anytime, anywhere.
					</Text>
				</View>

				{/* Mascot & Playful Speech Bubbles Section */}
				<View className="items-center justify-center my-6">
					<View style={{ width: 310, height: 310, justifyContent: "center", alignItems: "center" }}>
						{/* Mascot Fox */}
						<Image
							source={images.mascotWelcome}
							style={{ width: 230, height: 230 }}
							resizeMode="contain"
						/>

						{/* Bubble 1: "Hello!" (Top-Left, Light Blue) */}
						<View className="absolute top-4 left-0 bg-[#E5F0FF] rounded-2xl px-5 py-2.5 z-10">
							<Text className="text-[#0D132B] font-poppins-semibold text-[15px] tracking-wide">
								Hello!
							</Text>
							{/* Tail pointing down-right towards the mascot */}
							<View
								style={{
									position: "absolute",
									bottom: -5,
									right: 24,
									width: 12,
									height: 12,
									backgroundColor: "#E5F0FF",
									transform: [{ rotate: "45deg" }],
								}}
							/>
						</View>

						{/* Bubble 2: "¡Hola!" (Top-Right, Light Purple) */}
						<View className="absolute top-0 right-0 bg-[#EEECFF] rounded-2xl px-5 py-2.5 z-10">
							<Text className="text-[#6C4EF5] font-poppins-semibold text-[15px] tracking-wide">
								¡Hola!
							</Text>
							{/* Tail pointing down-left towards the mascot */}
							<View
								style={{
									position: "absolute",
									bottom: -5,
									left: 24,
									width: 12,
									height: 12,
									backgroundColor: "#EEECFF",
									transform: [{ rotate: "45deg" }],
								}}
							/>
						</View>

						{/* Bubble 3: "你好!" (Middle-Right, Light Peach) */}
						<View className="absolute bottom-16 right-[-8] bg-[#FFEFEA] rounded-2xl px-5 py-2.5 z-10">
							<Text className="text-[#FF4D4D] font-poppins-semibold text-[15px] tracking-wide">
								你好!
							</Text>
							{/* Tail pointing left towards the mascot */}
							<View
								style={{
									position: "absolute",
									left: -5,
									top: "40%",
									width: 12,
									height: 12,
									backgroundColor: "#FFEFEA",
									transform: [{ rotate: "45deg" }],
								}}
							/>
						</View>
					</View>
				</View>

				{/* Bottom CTA Button Area (Without pagination dots) */}
				<View className="w-full px-2 mb-4">
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-lingua-purple rounded-3xl py-4 flex-row items-center justify-center relative shadow-sm"
						onPress={() => router.push("/signup")}
					>
						<Text className="text-white text-center font-poppins-bold text-[17px] tracking-wide">
							Get Started
						</Text>

						{/* Absolute right-aligned Chevron icon */}
						<View className="absolute right-6 top-0 bottom-0 justify-center items-center">
							<View
								style={{
									width: 8,
									height: 8,
									borderTopWidth: 2,
									borderRightWidth: 2,
									borderColor: "#FFFFFF",
									transform: [{ rotate: "45deg" }],
								}}
							/>
						</View>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
}
