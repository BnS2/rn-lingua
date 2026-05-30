import { images } from "@/constants/images";

const lessonImageUrls: Record<string, string> = {
	"es-greetings":
		"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&h=640&fit=crop",
	"es-daily-life":
		"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&h=640&fit=crop",
	"es-travel-directions":
		"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=640&h=640&fit=crop",
	"es-shopping": "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=640&h=640&fit=crop",
	"es-family-friends":
		"https://images.unsplash.com/photo-1511895426328-dc8714191300?w=640&h=640&fit=crop",
	"fr-greetings":
		"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=640&fit=crop",
	"fr-daily-life":
		"https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=640&h=640&fit=crop",
	"fr-travel-directions":
		"https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=640&h=640&fit=crop",
	"fr-shopping":
		"https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?w=640&h=640&fit=crop",
	"fr-family-friends":
		"https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=640&h=640&fit=crop",
	"ja-greetings":
		"https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=640&h=640&fit=crop",
	"ja-daily-life":
		"https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=640&h=640&fit=crop",
	"ja-travel-directions":
		"https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=640&h=640&fit=crop",
	"ja-shopping":
		"https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=640&h=640&fit=crop",
	"ja-family-friends":
		"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&h=640&fit=crop",
};

export function getLessonArtworkSource(lessonId: string) {
	if (lessonId.endsWith("at-the-cafe")) {
		return images.lessonCafeHero;
	}

	return { uri: lessonImageUrls[lessonId] ?? `https://picsum.photos/seed/${lessonId}/640/640` };
}
