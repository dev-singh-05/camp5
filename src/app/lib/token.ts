import { supabase } from "@/utils/supabaseClient";

export async function getUserTokenBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching token balance:", error);
    return 0;
  }

  return data?.balance || 0;
}

export async function deductTokens(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  try {
    const currentBalance = await getUserTokenBalance(userId);
    
    if (currentBalance < amount) {
      console.error("Insufficient token balance");
      return false;
    }

    await supabase.rpc("update_user_token_balance", {
      p_user_id: userId,
      p_amount: -amount,
      p_type: "spend",
      p_description: description,
    });

    return true;
  } catch (error) {
    console.error("Error deducting tokens:", error);
    return false;
  }
}