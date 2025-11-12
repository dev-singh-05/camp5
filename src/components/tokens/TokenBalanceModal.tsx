"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Coins, TrendingUp, ShoppingBag, Gift, RotateCcw, Sparkles } from "lucide-react";

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
      case "purchase": return <Coins className="w-5 h-5" />;
      case "spend": return <ShoppingBag className="w-5 h-5" />;
      case "reward": return <Gift className="w-5 h-5" />;
      case "refund": return <RotateCcw className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "purchase": return "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "spend": return "from-red-500/20 to-orange-500/20 text-orange-400 border-orange-500/30";
      case "reward": return "from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30";
      case "refund": return "from-green-500/20 to-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default: return "from-gray-500/20 to-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400 bg-green-500/20 border-green-500/30";
      case "pending": return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      case "rejected": return "text-red-400 bg-red-500/20 border-red-500/30";
      default: return "text-gray-400 bg-gray-500/20 border-gray-500/30";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-pink-500/20 rounded-2xl blur-xl" />
          
          {/* Main container */}
          <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header with balance */}
            <div className="relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl"
              />
              
              <div className="relative p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Your Tokens</h2>
                      <p className="text-sm text-white/60">Manage your balance</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Balance display */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
                  <div className="text-center">
                    <div className="text-sm text-white/60 mb-2">Current Balance</div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent"
                      >
                        {balance}
                      </motion.div>
                    </div>
                    <div className="text-sm text-white/60">Tokens Available</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body - scrollable content */}
            <div className="overflow-y-auto max-h-[calc(90vh-280px)]">
              <div className="p-6 space-y-6">
                {/* Add Tokens Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose();
                    onAddTokens();
                  }}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-yellow-500/50 flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add More Tokens</span>
                </motion.button>

                {/* Transaction History */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full mx-auto mb-4"
                      />
                      <p className="text-white/60">Loading transactions...</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-white/60">No transactions yet</p>
                      <p className="text-sm text-white/40 mt-1">Your transaction history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx, index) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-all"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getTypeColor(tx.type)} border flex items-center justify-center flex-shrink-0`}>
                                {getTypeIcon(tx.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white capitalize truncate">
                                  {tx.type}
                                </div>
                                {tx.description && (
                                  <div className="text-xs text-white/60 truncate">{tx.description}</div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(tx.status)} capitalize`}>
                                    {tx.status}
                                  </span>
                                  <span className="text-xs text-white/40">
                                    {new Date(tx.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`text-lg font-bold flex-shrink-0 ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-6 bg-black/20">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}