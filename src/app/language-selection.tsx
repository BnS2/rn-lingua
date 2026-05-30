import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	Image,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { languages } from "@/data/languages";
import { useLanguageStore } from "@/store/languageStore";
import type { LanguageCode } from "@/types/learning";

const learnerCounts: Record<LanguageCode, string> = {
	es: "28.4M learners",
	fr: "19.4M learners",
	ja: "12.7M learners",
};

export default function LanguageSelection() {
	const router = useRouter();
	const { userId } = useAuth();
	const { width } = useWindowDimensions();
	const {
		hasHydrated,
		selectedLanguageCode: savedLanguageCode,
		setSelectedLanguage,
	} = useLanguageStore();
	const [selectedLanguageCode, setSelectedLanguageCode] = useState<LanguageCode | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const activeLanguageCode = hasHydrated
		? (selectedLanguageCode ?? savedLanguageCode ?? "es")
		: null;

	const filteredLanguages = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return languages;
		}

		return languages.filter((language) => {
			const searchableText =
				`${language.name} ${language.nativeName} ${language.description}`.toLowerCase();

			return searchableText.includes(normalizedQuery);
		});
	}, [searchQuery]);

	const navigateBackOrHome = () => {
		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/");
	};

	const handleConfirm = () => {
		if (!activeLanguageCode) {
			return;
		}

		if (!userId) {
			router.replace("/");
			return;
		}

		setSelectedLanguage(activeLanguageCode, userId);
		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/(tabs)/home");
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<View className="flex-row items-center justify-center px-6 pb-5 pt-3">
				<TouchableOpacity
					activeOpacity={0.75}
					className="absolute left-6 top-2 h-11 w-11 items-start justify-center"
					onPress={navigateBackOrHome}
				>
					<Ionicons name="chevron-back" size={32} color="#0D132B" />
				</TouchableOpacity>

				<Text className="text-h3 text-neutral-primary font-poppins-bold">Choose a language</Text>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View className="h-[54px] w-full flex-row items-center gap-4 rounded-[27px] border border-neutral-border bg-[#FAFAFC] px-6">
					<Ionicons name="search" size={26} color="#5C6685" />
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						placeholder="Search languages"
						placeholderTextColor="#6D768F"
						returnKeyType="search"
						style={styles.searchInput}
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				<View className="gap-4">
					<Text className="text-[18px] font-poppins-bold text-neutral-primary">Popular</Text>

					<View className="gap-0">
						{filteredLanguages.map((language) => {
							const isSelected = language.code === activeLanguageCode;

							return (
								<TouchableOpacity
									key={language.code}
									activeOpacity={0.86}
									className={`min-h-[92px] flex-row items-center rounded-[22px] bg-white px-5 ${
										isSelected
											? "border-2 border-lingua-purple bg-[#F8F6FF]"
											: "border border-[#F1F2F7]"
									}`}
									disabled={!hasHydrated}
									onPress={() => setSelectedLanguageCode(language.code)}
								>
									<View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#EEF0F5] bg-white">
										<Image
											source={{ uri: language.flagUrl }}
											style={styles.flag}
											resizeMode="cover"
										/>
									</View>

									<View className="ml-5 flex-1 gap-1">
										<Text className="text-[19px] font-poppins-bold text-neutral-primary">
											{language.name}
										</Text>
										<Text className="text-[16px] font-poppins-regular text-[#6D768F]">
											{learnerCounts[language.code]}
										</Text>
									</View>

									{isSelected ? (
										<View className="h-9 w-9 items-center justify-center rounded-full border-2 border-[#8A70FF] bg-lingua-purple">
											<Ionicons name="checkmark" size={24} color="#FFFFFF" />
										</View>
									) : (
										<Ionicons name="chevron-forward" size={26} color="#5C6685" />
									)}
								</TouchableOpacity>
							);
						})}

						{filteredLanguages.length === 0 ? (
							<View className="min-h-[92px] items-center justify-center rounded-[22px] border border-[#F1F2F7] bg-white px-5">
								<Text className="text-[16px] font-poppins-semibold text-neutral-primary">
									No languages found
								</Text>
								<Text className="mt-1 text-center text-[13px] font-poppins-regular text-[#6D768F]">
									Try searching for Spanish, French, or Japanese.
								</Text>
							</View>
						) : null}
					</View>
				</View>

				<TouchableOpacity
					activeOpacity={0.86}
					className={`h-[74px] w-full flex-row items-center justify-center gap-3 rounded-[22px] px-6 ${
						activeLanguageCode ? "bg-lingua-purple" : "bg-[#C8CBD5]"
					}`}
					disabled={!activeLanguageCode}
					onPress={handleConfirm}
				>
					<Ionicons name="arrow-forward-circle-outline" size={25} color="#FFFFFF" />
					<Text className="text-[17px] font-poppins-bold uppercase tracking-wide text-white">
						Continue
					</Text>
				</TouchableOpacity>

				<View style={[styles.earthFrame, { height: width * 0.68, width }]}>
					<Image
						source={images.earth}
						style={[
							styles.earth,
							{
								height: width * 1.03,
								transform: [{ translateX: width * 0.02 }, { translateY: -width * 0.15 }],
								width: width * 0.96,
							},
						]}
						resizeMode="contain"
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingBottom: 0,
		gap: 28,
	},
	flag: {
		height: 48,
		width: 48,
	},
	searchInput: {
		color: "#0D132B",
		flex: 1,
		fontFamily: "Poppins-Regular",
		fontSize: 18,
		height: 52,
		lineHeight: 24,
		padding: 0,
	},
	earthFrame: {
		overflow: "hidden",
		marginHorizontal: -24,
		marginTop: -18,
	},
	earth: {
		flexShrink: 0,
	},
});
