import { supabase } from "@/utils/supabaseClient";
import { PROFILE_OPTIONS } from "@/utils/profileField";

/* -------------------------------------------------------------------------- */
/* 🧩 CREATE MATCH */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 💬 FETCH MY MATCHES */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* ✉️ SEND CHAT MESSAGE */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 💌 GET ALL CHAT MESSAGES */
/* -------------------------------------------------------------------------- */
export async function getChatMessages(match_id: string) {
  const { data, error } = await supabase
    .from("dating_chats")
    .select("id, sender_id, message, created_at")
    .eq("match_id", match_id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------------------- */
/* 🕵️ REQUEST REVEAL (USE SERVER FUNCTION OR DIRECT UPDATE) */
/* -------------------------------------------------------------------------- */
export async function requestReveal(match_id: string, user_id: string) {
  try {
    // Try using the server-side RPC if defined (recommended)
    const { data, error } = await supabase.rpc("request_reveal", {
      p_match_id: match_id,
      p_user_id: user_id,
    });

    if (error) {
      console.error("❌ RPC request_reveal failed:", error);
      throw error;
    }

    return data;
  } catch (rpcErr) {
    // If RPC not found or fails, fallback to direct logic
    console.warn("⚠️ Falling back to manual requestReveal logic:", rpcErr);

    // Check if reveal record exists
    const { data: existing } = await supabase
      .from("dating_reveals")
      .select("*")
      .eq("match_id", match_id)
      .maybeSingle();

    // Create reveal entry if missing
    if (!existing) {
      const { error: insertErr } = await supabase
        .from("dating_reveals")
        .insert([{ match_id }]);
      if (insertErr) throw insertErr;
    }

    // Fetch match info
    const { data: match, error: matchErr } = await supabase
      .from("dating_matches")
      .select("user1_id, user2_id")
      .eq("id", match_id)
      .maybeSingle();

    if (matchErr || !match) throw matchErr || new Error("Match not found.");

    const fieldToUpdate =
      user_id === match.user1_id ? "user1_reveal" : "user2_reveal";

    const { data, error } = await supabase
      .from("dating_reveals")
      .update({ [fieldToUpdate]: true })
      .eq("match_id", match_id)
      .select("user1_reveal, user2_reveal")
      .single();

    if (error) throw error;
    return data;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔍 CHECK REVEAL STATUS */
/* -------------------------------------------------------------------------- */
export async function getRevealStatus(match_id: string) {
  const { data, error } = await supabase
    .from("dating_reveals")
    .select("match_id, user1_reveal, user2_reveal, created_at")
    .eq("match_id", match_id)
    .maybeSingle();

  if (error) {
    console.error("❌ Error getting reveal status:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* 🗑 DELETE MATCH (CASCADE CHATS & REVEALS) */
/* -------------------------------------------------------------------------- */
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
