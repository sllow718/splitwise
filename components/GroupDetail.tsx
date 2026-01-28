'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Group, Expense, Profile } from '@/lib/types';
import { formatCurrency, calculateGroupBalances } from '@/lib/utils';
import AddExpenseModal from './AddExpenseModal';
import styles from './GroupDetail.module.css';

interface GroupDetailProps {
    group: Group;
    currentUser: User;
    onBack: () => void;
}

interface ExpenseWithPayer extends Expense {
    payer?: Profile;
}

export default function GroupDetail({ group, currentUser, onBack }: GroupDetailProps) {
    const [expenses, setExpenses] = useState<ExpenseWithPayer[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<Map<string, number>>(new Map());

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from('group_members')
            .select(`
        profile:profiles (*)
      `)
            .eq('group_id', group.id);

        if (data) {
            const memberProfiles = data
                .map((item: { profile: Profile | Profile[] | null }) => {
                    const profile = item.profile;
                    return Array.isArray(profile) ? profile[0] : profile;
                })
                .filter((p): p is Profile => p !== null);
            setMembers(memberProfiles);
        }
    }, [group.id]);

    const fetchExpenses = useCallback(async () => {
        const { data } = await supabase
            .from('expenses')
            .select(`
        *,
        payer:profiles!payer_id (*)
      `)
            .eq('group_id', group.id)
            .order('created_at', { ascending: false });

        if (data) {
            setExpenses(data.map(expense => ({
                ...expense,
                payer: Array.isArray(expense.payer) ? expense.payer[0] : expense.payer
            })));

            // Fetch splits and calculate balances
            const expenseIds = data.map(e => e.id);
            if (expenseIds.length > 0) {
                const { data: splits } = await supabase
                    .from('expense_splits')
                    .select('*')
                    .in('expense_id', expenseIds);

                if (splits) {
                    const expensesWithSplits = data.map(expense => ({
                        payer_id: expense.payer_id,
                        splits: splits
                            .filter(s => s.expense_id === expense.id)
                            .map(s => ({ user_id: s.user_id, amount: s.amount })),
                    }));
                    setBalances(calculateGroupBalances(expensesWithSplits));
                }
            }
        }
        setLoading(false);
    }, [group.id]);

    useEffect(() => {
        fetchMembers();
        fetchExpenses();
    }, [fetchMembers, fetchExpenses]);

    const handleExpenseAdded = (newExpense: Expense) => {
        fetchExpenses(); // Refresh to get full expense with payer info
        setShowAddExpense(false);
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            food: '🍽️',
            transport: '🚗',
            rent: '🏠',
            utilities: '💡',
            entertainment: '🎬',
            other: '📦',
        };
        return icons[category] || '📦';
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            food: '#f59e0b',
            transport: '#3b82f6',
            rent: '#10b981',
            utilities: '#8b5cf6',
            entertainment: '#ec4899',
            other: '#6b7280',
        };
        return colors[category] || '#6b7280';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getUserBalance = (userId: string) => {
        return balances.get(userId) || 0;
    };

    const getBalanceClass = (balance: number) => {
        if (balance > 0) return 'balance-positive';
        if (balance < 0) return 'balance-negative';
        return 'balance-neutral';
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={onBack} className={`btn btn-ghost ${styles.backBtn}`}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <polyline points="15,18 9,12 15,6" />
                    </svg>
                    Back
                </button>
                <h1 className={styles.title}>{group.name}</h1>
                <button
                    onClick={() => setShowAddExpense(true)}
                    className="btn btn-primary"
                >
                    + Add Expense
                </button>
            </header>

            <div className={styles.content}>
                <aside className={styles.sidebar}>
                    <div className={`glass-card ${styles.balanceCard}`}>
                        <h3 className={styles.sidebarTitle}>Balances</h3>
                        {members.length === 0 ? (
                            <p className={styles.emptyText}>No members yet</p>
                        ) : (
                            <ul className={styles.balanceList}>
                                {members.map((member) => {
                                    const balance = getUserBalance(member.id);
                                    return (
                                        <li key={member.id} className={styles.balanceItem}>
                                            <div className={styles.memberInfo}>
                                                {member.avatar_url ? (
                                                    <img
                                                        src={member.avatar_url}
                                                        alt={member.full_name}
                                                        className={styles.memberAvatar}
                                                    />
                                                ) : (
                                                    <div className={`avatar avatar-sm ${styles.memberAvatar}`}>
                                                        {getInitials(member.full_name)}
                                                    </div>
                                                )}
                                                <span className={styles.memberName}>
                                                    {member.full_name}
                                                    {member.id === currentUser.id && ' (You)'}
                                                </span>
                                            </div>
                                            <span className={`balance ${getBalanceClass(balance)}`}>
                                                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                <main className={styles.main}>
                    <div className={styles.expenseHeader}>
                        <h2 className={styles.sectionTitle}>Expenses</h2>
                        <span className={styles.expenseCount}>{expenses.length} total</span>
                    </div>

                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className="spinner"></div>
                            <p>Loading expenses...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💸</div>
                            <h3 className="empty-state-title">No expenses yet</h3>
                            <p className="empty-state-text">
                                Add your first expense to start tracking.
                            </p>
                            <button
                                onClick={() => setShowAddExpense(true)}
                                className="btn btn-primary"
                            >
                                Add First Expense
                            </button>
                        </div>
                    ) : (
                        <div className="expense-list">
                            {expenses.map((expense) => (
                                <div key={expense.id} className="expense-item">
                                    <div
                                        className="expense-icon"
                                        style={{ background: getCategoryColor(expense.category) }}
                                    >
                                        {getCategoryIcon(expense.category)}
                                    </div>
                                    <div className="expense-info">
                                        <div className="expense-description">
                                            {expense.description}
                                            {expense.attachment_url && (
                                                <span className={styles.attachmentBadge} title="Has attachment">
                                                    📎
                                                </span>
                                            )}
                                        </div>
                                        <div className="expense-meta">
                                            Paid by {expense.payer?.full_name || 'Unknown'} •{' '}
                                            {new Date(expense.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                    <div className="expense-amount">
                                        <div className="expense-amount-value">
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </div>
                                        <span className={`badge badge-${expense.category === 'food' ? 'warning' : 'primary'}`}>
                                            {expense.category}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {showAddExpense && (
                <AddExpenseModal
                    groupId={group.id}
                    members={members}
                    currentUserId={currentUser.id}
                    onClose={() => setShowAddExpense(false)}
                    onAdded={handleExpenseAdded}
                />
            )}
        </div>
    );
}
