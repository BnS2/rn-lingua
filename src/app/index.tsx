import { useRouter } from "expo-router";
import { Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";

export default function Index() {
	const router = useRouter();

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<View className="flex-1 justify-between px-6 py-8">
				{/* Top Section - Active Badge */}
				<View className="items-center">
					<View className="bg-neutral-surface border border-neutral-border rounded-full px-3 py-1.5 flex-row items-center gap-2">
						<View className="w-2 h-2 rounded-full bg-lingua-green" />
						<Text className="text-caption text-neutral-primary font-poppins-semibold uppercase tracking-wider">
							Design System Active
						</Text>
					</View>
				</View>

				{/* Hero Mascot Section */}
				<View className="flex-1 justify-center items-center my-8">
					<Image
						source={images.mascotWelcome}
						style={{ width: 240, height: 240 }}
						resizeMode="contain"
					/>

					{/* Brand Logo & Name */}
					<View className="flex-row items-center justify-center gap-3 mt-6">
						<Image
							source={images.mascotLogo}
							style={{ width: 44, height: 44 }}
							resizeMode="contain"
						/>
						<Text className="text-h1 text-neutral-primary font-poppins-bold tracking-tight">
							muolingo
						</Text>
					</View>

					{/* Tagline */}
					<Text className="text-body-large text-neutral-secondary text-center mt-4 px-4 font-poppins-regular leading-6">
						Learn languages playfully with interactive AI teachers and real-time chat tutors.
					</Text>
				</View>

				{/* Bottom CTA Button Area */}
				<View className="w-full gap-4">
					{/* Primary Action Button (Playful 3D styling) */}
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-lingua-purple border-b-4 border-lingua-deep-purple rounded-2xl py-4 items-center justify-center shadow-sm"
						onPress={() => router.push("/onboarding")}
					>
						<Text className="text-white text-center font-poppins-bold text-base tracking-wider">
							GET STARTED
						</Text>
					</TouchableOpacity>

					{/* Secondary Action Button (Outline 3D styling) */}
					<TouchableOpacity
						activeOpacity={0.85}
						className="w-full bg-white border-2 border-b-4 border-neutral-border rounded-2xl py-4 items-center justify-center"
						onPress={() => console.log("Login pressed")}
					>
						<Text className="text-lingua-purple text-center font-poppins-bold text-base tracking-wider">
							I ALREADY HAVE AN ACCOUNT
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
}
