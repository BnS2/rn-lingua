import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { getLessonArtworkSource } from "@/constants/lesson-artwork";
import { getLessonsByUnit } from "@/data/lessons";
import { getUnitsByLanguage } from "@/data/units";
import { useLanguageStore } from "@/store/languageStore";
import { useProgressStore } from "@/store/progressStore";
import type { LearningLesson } from "@/types/learning";

const ACTIVE_LESSON_INDEX = 2;

type LessonStatus = "completed" | "in-progress" | "not-started";

function getLessonStatus(
	lessonId: string,
	index: number,
	completedLessonIds: string[],
): LessonStatus {
	if (completedLessonIds.includes(lessonId) || index < ACTIVE_LESSON_INDEX) {
		return "completed";
	}

	if (index === ACTIVE_LESSON_INDEX) {
		return "in-progress";
	}

	return "not-started";
}

function getLessonArtwork(lesson: LearningLesson, status: LessonStatus) {
	if (status === "in-progress") {
		return images.lessonInprogressIcon;
	}

	return getLessonArtworkSource(lesson.id);
}

export default function LearnScreen() {
	const router = useRouter();
	const selectedLanguageCode = useLanguageStore((state) => state.selectedLanguageCode);
	const completedLessonIds = useProgressStore((state) => state.completedLessonIds);
	const activeLanguageCode = selectedLanguageCode ?? "es";

	const currentUnit = useMemo(() => {
		const units = getUnitsByLanguage(activeLanguageCode);
		return units[0] ?? null;
	}, [activeLanguageCode]);

	const lessons = useMemo<LearningLesson[]>(() => {
		if (!currentUnit) {
			return [];
		}

		const unitLessons = getLessonsByUnit(currentUnit.id) as LearningLesson[];
		const lessonById = new Map(unitLessons.map((lesson) => [lesson.id, lesson]));

		return currentUnit.lessonIds.reduce<LearningLesson[]>((orderedLessons, lessonId) => {
			const lesson = lessonById.get(lessonId);

			if (lesson) {
				orderedLessons.push(lesson);
			}

			return orderedLessons;
		}, []);
	}, [currentUnit]);

	const activeLesson = lessons[ACTIVE_LESSON_INDEX] ?? lessons[0];
	const completedCount = Math.min(ACTIVE_LESSON_INDEX, lessons.length);

	const openLesson = (lessonId: string) => {
		router.push({
			pathname: "/lesson/[lessonId]",
			params: { lessonId },
		});
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<Image source={images.lessonCafeHero} style={styles.heroImage} contentFit="cover" />

					<View style={styles.header}>
						<TouchableOpacity
							accessibilityLabel="Go back"
							accessibilityRole="button"
							activeOpacity={0.75}
							style={styles.backButton}
							onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
						>
							<Ionicons name="chevron-back" size={34} color="#0D132B" />
						</TouchableOpacity>

						<View style={styles.headerText}>
							<Text style={styles.title}>{activeLesson?.title ?? "Lessons"}</Text>
							<Text style={styles.subtitle}>
								Unit {Math.min(ACTIVE_LESSON_INDEX + 1, Math.max(lessons.length, 1))} •{" "}
								{completedCount + 1} / {lessons.length || 1} lessons
							</Text>
						</View>

						<View style={styles.bookmark}>
							<Ionicons name="bookmark-outline" size={29} color="#6C4EF5" />
						</View>
					</View>
				</View>

				<View style={styles.tabs}>
					<View style={styles.activeTab}>
						<Text style={styles.activeTabText}>Lessons</Text>
					</View>
					<View style={styles.inactiveTab}>
						<Text style={styles.inactiveTabText}>Practice</Text>
					</View>
				</View>

				<View style={styles.lessonList}>
					{lessons.length === 0 ? (
						<View style={styles.emptyLessonsCard}>
							<Text style={styles.emptyLessonsTitle}>No lessons yet</Text>
							<Text style={styles.emptyLessonsText}>
								Choose a different language to see available lessons.
							</Text>
						</View>
					) : null}

					{lessons.map((lesson, index) => {
						const status = getLessonStatus(lesson.id, index, completedLessonIds);
						const isActive = status === "in-progress";

						return (
							<TouchableOpacity
								key={lesson.id}
								accessibilityLabel={`Open ${lesson.title}`}
								accessibilityRole="button"
								activeOpacity={0.86}
								style={[styles.lessonCard, isActive && styles.activeLessonCard]}
								onPress={() => openLesson(lesson.id)}
							>
								<View style={styles.lessonCopy}>
									<Text style={[styles.lessonNumber, isActive && styles.activeLessonNumber]}>
										Lesson {index + 1}
									</Text>
									<Text style={styles.lessonTitle}>{lesson.title}</Text>
									{status !== "completed" ? (
										<Text style={[styles.lessonMeta, isActive && styles.activeLessonMeta]}>
											{isActive ? "In progress" : "0 / 6 lessons"}
										</Text>
									) : null}
								</View>

								{status === "completed" ? (
									<View style={styles.completedBadge}>
										<Ionicons name="checkmark" size={27} color="#FFFFFF" />
									</View>
								) : status === "not-started" ? (
									<View style={styles.lockIcon}>
										<Ionicons name="lock-closed-outline" size={27} color="#63708F" />
									</View>
								) : (
									<Image
										source={getLessonArtwork(lesson, status)}
										style={styles.lessonArtwork}
										contentFit="contain"
									/>
								)}
							</TouchableOpacity>
						);
					})}
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
		paddingBottom: 128,
	},
	hero: {
		height: 454,
		overflow: "hidden",
		backgroundColor: "#EAF6FF",
	},
	heroImage: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: 360,
		width: "100%",
	},
	header: {
		position: "absolute",
		top: 20,
		right: 24,
		left: 18,
		flexDirection: "row",
		alignItems: "flex-start",
	},
	backButton: {
		width: 44,
		height: 44,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	headerText: {
		flex: 1,
		paddingTop: 3,
		paddingLeft: 8,
	},
	title: {
		fontFamily: "Poppins-Bold",
		fontSize: 25,
		lineHeight: 32,
		color: "#0D132B",
	},
	subtitle: {
		marginTop: 2,
		fontFamily: "Poppins-SemiBold",
		fontSize: 17,
		lineHeight: 24,
		color: "#64708D",
	},
	bookmark: {
		width: 37,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	tabs: {
		height: 80,
		marginTop: -50,
		marginHorizontal: 19,
		flexDirection: "row",
		borderRadius: 22,
		backgroundColor: "rgba(255, 255, 255, 0.94)",
		boxShadow: "0 12px 24px rgba(52, 56, 79, 0.09)",
	},
	activeTab: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 22,
		backgroundColor: "#FFFFFF",
		borderBottomWidth: 4,
		borderBottomColor: "#654BFF",
	},
	inactiveTab: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	activeTabText: {
		fontFamily: "Poppins-Bold",
		fontSize: 19,
		lineHeight: 24,
		color: "#654BFF",
	},
	inactiveTabText: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 19,
		lineHeight: 24,
		color: "#56617E",
	},
	lessonList: {
		paddingTop: 26,
		paddingHorizontal: 19,
		gap: 10,
	},
	lessonCard: {
		minHeight: 110,
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#ECEFF6",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 26,
		paddingVertical: 17,
	},
	activeLessonCard: {
		minHeight: 134,
		borderWidth: 2,
		borderColor: "#9B7CFF",
		backgroundColor: "#FBFAFF",
	},
	lessonCopy: {
		flex: 1,
		gap: 8,
		paddingRight: 14,
	},
	lessonNumber: {
		fontFamily: "Poppins-Bold",
		fontSize: 16,
		lineHeight: 20,
		color: "#7C849E",
	},
	activeLessonNumber: {
		color: "#654BFF",
	},
	lessonTitle: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 19,
		lineHeight: 25,
		color: "#0D132B",
	},
	lessonMeta: {
		fontFamily: "Poppins-SemiBold",
		fontSize: 16,
		lineHeight: 20,
		color: "#7C849E",
	},
	activeLessonMeta: {
		color: "#654BFF",
	},
	completedBadge: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#20C61B",
	},
	lockIcon: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	lessonArtwork: {
		width: 58,
		height: 58,
	},
	emptyLessonsCard: {
		minHeight: 110,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#ECEFF6",
		borderRadius: 18,
		backgroundColor: "#FFFFFF",
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	emptyLessonsTitle: {
		fontFamily: "Poppins-Bold",
		fontSize: 18,
		lineHeight: 24,
		color: "#0D132B",
	},
	emptyLessonsText: {
		marginTop: 4,
		textAlign: "center",
		fontFamily: "Poppins-Regular",
		fontSize: 14,
		lineHeight: 21,
		color: "#64708D",
	},
});
