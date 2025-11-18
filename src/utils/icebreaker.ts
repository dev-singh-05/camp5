// utils/icebreaker.ts
import { supabase } from "./supabaseClient";

export type IcebreakerQuestion = {
  id: string;
  question: string;
  is_active: boolean;
  usage_type?: "match_dating" | "ice_breaker_chat" | "both";
  created_at?: string;
  updated_at?: string;
};

/**
 * Get all icebreaker questions (for admin panel)
 */
export async function getAllIcebreakerQuestions(): Promise<IcebreakerQuestion[]> {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching icebreaker questions:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific icebreaker question by ID
 */
export async function getIcebreakerQuestion(questionId: string): Promise<IcebreakerQuestion | null> {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching icebreaker question:", error);
    return null;
  }

  return data;
}

/**
 * Create a new icebreaker question
 */
export async function createIcebreakerQuestion(
  question: string,
  isActive: boolean = true,
  usageType: "match_dating" | "ice_breaker_chat" | "both" = "both"
) {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .insert([{ question, is_active: isActive, usage_type: usageType }])
    .select()
    .single();

  if (error) {
    console.error("Error creating icebreaker question:", error);
    throw error;
  }

  return data;
}

/**
 * Update an icebreaker question
 */
export async function updateIcebreakerQuestion(
  questionId: string,
  updates: { question?: string; is_active?: boolean; usage_type?: "match_dating" | "ice_breaker_chat" | "both" }
) {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", questionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating icebreaker question:", error);
    throw error;
  }

  return data;
}

/**
 * Delete an icebreaker question
 */
export async function deleteIcebreakerQuestion(questionId: string) {
  const { error } = await supabase
    .from("icebreaker_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    console.error("Error deleting icebreaker question:", error);
    throw error;
  }

  return true;
}

/**
 * Toggle active status of an icebreaker question
 */
export async function toggleIcebreakerQuestionStatus(questionId: string, isActive: boolean) {
  return updateIcebreakerQuestion(questionId, { is_active: isActive });
}

/**
 * Get the icebreaker question for a specific match
 */
export async function getMatchIcebreakerQuestion(matchId: string): Promise<IcebreakerQuestion | null> {
  // First get the match to find the question ID
  const { data: match, error: matchError } = await supabase
    .from("dating_matches")
    .select("icebreaker_question_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match?.icebreaker_question_id) {
    console.error("Error fetching match icebreaker question:", matchError);
    return null;
  }

  // Now get the actual question
  return getIcebreakerQuestion(match.icebreaker_question_id);
}

/**
 * Get a random icebreaker question for dating matches
 */
export async function getRandomMatchIcebreakerQuestion(): Promise<IcebreakerQuestion | null> {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .select("*")
    .eq("is_active", true)
    .in("usage_type", ["match_dating", "both"]);

  if (error) {
    console.error("Error fetching random match icebreaker question:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Pick a random question from the list
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

/**
 * Get a random icebreaker question for chat
 */
export async function getRandomChatIcebreakerQuestion(): Promise<IcebreakerQuestion | null> {
  const { data, error } = await supabase
    .from("icebreaker_questions")
    .select("*")
    .eq("is_active", true)
    .in("usage_type", ["ice_breaker_chat", "both"]);

  if (error) {
    console.error("Error fetching random chat icebreaker question:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Pick a random question from the list
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}