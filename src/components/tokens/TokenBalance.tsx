"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type TokenBalanceProps = {
  userId: string;
  onClick?: () => void;
};

export default function TokenBalance({ userId, onClick }: TokenBalanceProps) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
    
    // Subscribe to balance changes in real-time
    const channel = supabase
      .channel(`tokens-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_tokens",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'balance' in payload.new) {
            setBalance(payload.new.balance as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadBalance() {
    try {
      let { data, error } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading token balance:", error);
        return;
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_tokens")
          .insert({ user_id: userId, balance: 0 })
          .select("balance")
          .single();

        if (insertError) {
          console.error("Error creating token balance:", insertError);
          return;
        }
        data = newData;
      }

      setBalance(data?.balance || 0);
    } catch (err) {
      console.error("loadBalance error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 cursor-pointer hover:shadow-md transition"
      >
        <span className="text-2xl">💎</span>
        <span className="text-sm text-gray-500">Loading...</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 cursor-pointer hover:shadow-md transition-all hover:scale-105"
    >
      <span className="text-2xl">💎</span>
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-500">Tokens</span>
        <span className="text-lg font-bold text-purple-700">{balance}</span>
      </div>
    </button>
  );
}