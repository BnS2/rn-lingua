export type PlanItemKind = "lesson" | "ai-conversation" | "vocabulary" | "ai-video-call";

export type PlanItem = {
	id: string;
	kind: PlanItemKind;
	title: string;
	subtitle: string;
	completed: boolean;
};

export const todaysPlan: PlanItem[] = [
	{
		id: "plan-lesson",
		kind: "lesson",
		title: "Lesson",
		subtitle: "At the café",
		completed: true,
	},
	{
		id: "plan-ai-conversation",
		kind: "ai-conversation",
		title: "AI Conversation",
		subtitle: "Talk about your day",
		completed: false,
	},
	{
		id: "plan-vocabulary",
		kind: "vocabulary",
		title: "New words",
		subtitle: "10 words",
		completed: false,
	},
];

export type NextUpItem = {
	id: string;
	kind: PlanItemKind;
	label: string;
	title: string;
	subtitle: string;
	avatarUrl: string;
};

export const nextUpItem: NextUpItem = {
	id: "next-ai-video-call",
	kind: "ai-video-call",
	label: "Next up",
	title: "AI Video Call",
	subtitle: "Practice speaking",
	avatarUrl:
		"https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=200&h=200&fit=crop&crop=face",
};
