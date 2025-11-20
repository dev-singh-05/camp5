// News item types
export type NewsType =
  | "rating"
  | "user_message"
  | "dating_chat"
  | "club_event"
  | "club_message"
  | "campus_news";

export type NewsItem = {
  id: string;
  type: NewsType;
  title: string;
  body?: string | null;
  created_at: string;
  meta?: Record<string, any>; // Stores IDs for navigation
};

// Ad type
export type Ad = {
  id: string;
  name: string;
  image_path: string | null;
  title: string | null;
  body: string | null;
  action_url: string | null;
  placement: string;
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

// Campus News Article type
export type CampusNewsArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string; // "academic", "sports", "events", etc.
  published: boolean;
  featured: boolean;
  pinned: boolean;
  image_url: string | null;
  views: number;
  created_at: string;
  published_at: string | null;
};

// Profile type
export type Profile = {
  id: string;
  full_name?: string;
  username?: string;
  description?: string | null;
  profile_photo?: string | null;
  gender?: string;
  year?: string;
  branch?: string;
  location?: string;
  hometown?: string;
  profile_completed?: boolean;
  avg_confidence?: number | null;
  avg_humbleness?: number | null;
  avg_friendliness?: number | null;
  avg_intelligence?: number | null;
  avg_communication?: number | null;
  avg_overall_xp?: number | null;
  total_ratings?: number | null;
};

// Token transaction type
export type TokenTransaction = {
  id: string;
  amount: number;
  type: string; // "purchase", "spend", "reward", "refund"
  status: string; // "completed", "pending", "rejected"
  description: string | null;
  created_at: string;
};

// Notification preferences
export type NotificationPreferences = {
  notificationsPaused: boolean;
  ratingsMsgEnabled: boolean;
  datingMsgEnabled: boolean;
  clubsMsgEnabled: boolean;
  campusNewsEnabled: boolean;
};

// Onboarding data
export type OnboardingData = {
  full_name: string;
  location: string;
  hometown: string;
  year: string;
  branch: string;
  gender: string;
};
