import { supabase } from "./supabaseClient";

export type SurpriseQuestion = {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  question: string;
  answer: string | null;
  is_revealed: boolean;
  revealed_at: string | null;
  answered_at: string | null;
  created_at: string;
};

export async function createSurpriseQuestion(
  matchId: string,
  senderId: string,
  receiverId: string,
  question: string
) {
  const { data, error } = await supabase
    .from("surprise_questions")
    .insert([
      {
        match_id: matchId,
        sender_id: senderId,
        receiver_id: receiverId,
        question,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSurpriseQuestions(matchId: string) {
  const { data, error } = await supabase
    .from("surprise_questions")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function revealSurpriseQuestion(questionId: string) {
  const { data, error } = await supabase
    .from("surprise_questions")
    .update({
      is_revealed: true,
      revealed_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function answerSurpriseQuestion(questionId: string, answer: string) {
  const { data, error } = await supabase
    .from("surprise_questions")
    .update({
      answer,
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}