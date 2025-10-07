import { supabase } from "@/utils/supabaseClient";

/**
 * Create a match between two users.
 */
export async function createMatch(
  user1_id: string,
  user2_id: string,
  type: "random" | "interest"
) {
  const { data, error } = await supabase
    .from("dating_matches")
    .insert([{ user1_id, user2_id, match_type: type }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch matches for the current user.
 */
export async function getMyMatches() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("dating_matches")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching matches:", error);
    return [];
  }

  return data;
}

/**
 * Send a chat message in a match.
 */
export async function sendChatMessage(
  match_id: string,
  sender_id: string,
  message: string
) {
  const { data, error } = await supabase
    .from("dating_chats")
    .insert([{ match_id, sender_id, message }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all chat messages for a match.
 */
export async function getChatMessages(match_id: string) {
  const { data, error } = await supabase
    .from("dating_chats")
    .select("id, sender_id, message, created_at")
    .eq("match_id", match_id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Request reveal (set current user’s reveal = true).
 */
export async function requestReveal(match_id: string, user_id: string) {
  const { data: existing } = await supabase
    .from("dating_reveals")
    .select("*")
    .eq("match_id", match_id)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from("dating_reveals")
      .insert([{ match_id }])
      .select()
      .single();
    if (error) throw error;
  }

  const field =
    existing?.user1_reveal === null || existing?.user1_reveal === false
      ? "user1_reveal"
      : "user2_reveal";

  const { data, error } = await supabase
    .from("dating_reveals")
    .update({ [field]: true, revealed_at: new Date().toISOString() })
    .eq("match_id", match_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check reveal status of a match.
 */
export async function getRevealStatus(match_id: string) {
  const { data, error } = await supabase
    .from("dating_reveals")
    .select("user1_reveal, user2_reveal, revealed_at")
    .eq("match_id", match_id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Delete a match → cascade removes chats + reveals automatically.
 */
export async function deleteMatch(matchId: string) {
  console.log("🗑 Deleting match with cascade:", matchId);

  const { error } = await supabase
    .from("dating_matches")
    .delete()
    .eq("id", matchId);

  if (error) {
    console.error("❌ Error deleting match:", error);
    throw error;
  }

  console.log("✅ Match (and related chats/reveals) deleted:", matchId);
  return true;
}

