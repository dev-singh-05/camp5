"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type TokenBalanceModalProps = {
  userId: string;
  onClose: () => void;
  onAddTokens: () => void;
};

type Transaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
};

export default function TokenBalanceModal({ userId, onClose, onAddTokens }: TokenBalanceModalProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    try {
      // Load balance
      const { data: tokenData } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      setBalance(tokenData?.balance || 0);

      // Load recent transactions
      const { data: txData } = await supabase
        .from("token_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransactions(txData || []);
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "purchase": return "💳";
      case "spend": return "🛒";
      case "reward": return "🎁";
      case "refund": return "↩️";
      default: return "💎";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "pending": return "text-yellow-600";
      case "rejected": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">💎 Your Tokens</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ✖
            </button>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-sm opacity-90 mb-1">Current Balance</div>
            <div className="text-5xl font-bold">{balance}</div>
            <div className="text-sm opacity-90 mt-1">Tokens</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Add Tokens Button */}
          <button
            onClick={() => {
              onClose();
              onAddTokens();
            }}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg mb-6 flex items-center justify-center gap-2"
          >
            <span className="text-2xl">➕</span>
            <span>Add More Tokens</span>
          </button>

          {/* Transaction History */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Transactions</h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(tx.type)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {tx.type}
                        </div>
                        {tx.description && (
                          <div className="text-xs text-gray-500">{tx.description}</div>
                        )}
                        <div className={`text-xs font-medium ${getStatusColor(tx.status)} capitalize`}>
                          {tx.status}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}