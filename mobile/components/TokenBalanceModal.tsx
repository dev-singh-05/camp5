import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Plus, Coins, TrendingUp, ShoppingBag, Gift, RotateCcw, Sparkles } from 'lucide-react-native';
import { supabase } from '../utils/supabaseClient';

type TokenBalanceModalProps = {
  visible: boolean;
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

export function TokenBalanceModal({ visible, userId, onClose, onAddTokens }: TokenBalanceModalProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && userId) {
      loadData();
    }
  }, [visible, userId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load balance
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      setBalance(tokenData?.balance || 0);

      // Load recent transactions
      const { data: txData } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions(txData || []);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Coins color="#fff" size={20} />;
      case 'spend':
        return <ShoppingBag color="#fff" size={20} />;
      case 'reward':
        return <Gift color="#fff" size={20} />;
      case 'refund':
        return <RotateCcw color="#fff" size={20} />;
      default:
        return <Sparkles color="#fff" size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return ['#3b82f6', '#06b6d4'];
      case 'spend':
        return ['#ef4444', '#f97316'];
      case 'reward':
        return ['#a855f7', '#ec4899'];
      case 'refund':
        return ['#10b981', '#059669'];
      default:
        return ['#64748b', '#475569'];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.3)', text: '#10b981' };
      case 'pending':
        return { bg: 'rgba(251,191,36,0.2)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' };
      case 'rejected':
        return { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' };
      default:
        return { bg: 'rgba(100,116,139,0.2)', border: 'rgba(100,116,139,0.3)', text: '#64748b' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Animated gradient background */}
          <View style={styles.gradientBg} />

          <LinearGradient colors={['#0f1729', '#1e1b4b', '#0f1729']} style={styles.modalContent}>
            {/* Header with balance */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={['rgba(251,191,36,0.2)', 'rgba(249,115,22,0.2)']}
                style={styles.headerGradient}
              >
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View style={styles.headerIcon}>
                      <Coins color="#fff" size={24} />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>Your Tokens</Text>
                      <Text style={styles.headerSubtitle}>Manage your balance</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <X color="#fff" size={24} />
                  </TouchableOpacity>
                </View>

                {/* Balance display */}
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                  <Text style={styles.balanceAmount}>{balance}</Text>
                  <Text style={styles.balanceSubtext}>Tokens Available</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Body - scrollable content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Add Tokens Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  onClose();
                  onAddTokens();
                }}
              >
                <LinearGradient colors={['#fbbf24', '#f97316']} style={styles.addButtonGradient}>
                  <Plus color="#fff" size={20} />
                  <Text style={styles.addButtonText}>Add More Tokens</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Transaction History */}
              <View style={styles.transactionsSection}>
                <View style={styles.sectionHeader}>
                  <TrendingUp color="rgba(255,255,255,0.6)" size={20} />
                  <Text style={styles.sectionTitle}>Recent Transactions</Text>
                </View>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fbbf24" size="large" />
                    <Text style={styles.loadingText}>Loading transactions...</Text>
                  </View>
                ) : transactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📝</Text>
                    <Text style={styles.emptyText}>No transactions yet</Text>
                    <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
                  </View>
                ) : (
                  <View style={styles.transactionsList}>
                    {transactions.map((tx, index) => {
                      const statusColor = getStatusColor(tx.status);
                      const typeColors = getTypeColor(tx.type);

                      return (
                        <View key={tx.id} style={styles.transactionCard}>
                          <View style={styles.transactionContent}>
                            <View style={styles.transactionLeft}>
                              <LinearGradient colors={typeColors} style={styles.transactionIcon}>
                                {getTypeIcon(tx.type)}
                              </LinearGradient>
                              <View style={styles.transactionInfo}>
                                <Text style={styles.transactionType}>
                                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                </Text>
                                {tx.description && (
                                  <Text style={styles.transactionDescription} numberOfLines={1}>
                                    {tx.description}
                                  </Text>
                                )}
                                <View style={styles.transactionMeta}>
                                  <View
                                    style={[
                                      styles.statusBadge,
                                      {
                                        backgroundColor: statusColor.bg,
                                        borderColor: statusColor.border,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                    </Text>
                                  </View>
                                  <Text style={styles.transactionDate}>
                                    {new Date(tx.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.transactionAmount,
                                { color: tx.amount > 0 ? '#10b981' : '#ef4444' },
                              ]}
                            >
                              {tx.amount > 0 ? '+' : ''}
                              {tx.amount}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
                <Text style={styles.closeFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 24,
  },
  modalContent: {
    flex: 1,
  },
  headerSection: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  transactionsSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  transactionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  closeFooterButton: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
