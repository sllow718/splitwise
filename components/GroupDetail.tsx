'use client';

import { useState, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ExpenseSplit, ExpenseWithSplits, Group, Expense, Profile } from '@/lib/types';
import { formatCurrency, calculateGroupBalances } from '@/lib/utils';
import { getCategoryIcon, getCategoryColor } from '@/lib/expenseCategory';
import ExpenseDetailModal from './ExpenseDetailModal';
import ExpenseModal from './ExpenseModal';
import AddExpenseModal from './AddExpenseModal';
import AddMemberModal from './AddMemberModal';
import styles from './GroupDetail.module.css';

interface GroupDetailProps {
    group: Group;
    currentUser: User;
    onBack: () => void;
}

interface ExpenseWithPayer extends Expense {
    payer?: Profile | null;
}

interface ExpenseSplitWithUser extends ExpenseSplit {
    user?: Profile | null;
}

interface ExpenseDetailData {
    expense: ExpenseWithPayer;
    splits: ExpenseSplitWithUser[];
}

export default function GroupDetail({ group, currentUser, onBack }: GroupDetailProps) {
    const [expenses, setExpenses] = useState<ExpenseWithPayer[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<Map<string, number>>(new Map());
    const [expenseDetailData, setExpenseDetailData] = useState<ExpenseDetailData | null>(null);
    const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<ExpenseWithSplits | null>(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

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

    const handleMemberAdded = (newMember: Profile) => {
        setMembers(prev => [...prev, newMember]);
        // Don't close modal automatically to allow adding multiple
    };

    const openExpenseDetail = async (expense: ExpenseWithPayer) => {
        setDeletingExpenseId(null);
        setExpenseDetailData({ expense, splits: [] });
        setIsExpenseDetailOpen(true);
        setDetailLoading(true);

        try {
            const { data: splitRows, error } = await supabase
                .from('expense_splits')
                .select(`
            *,
            user:profiles!user_id (*)
          `)
                .eq('expense_id', expense.id);

            if (error) {
                throw error;
            }

            const mappedSplits: ExpenseDetailData['splits'] = (splitRows || []).map((split) => ({
                ...split,
                user: Array.isArray(split.user) ? split.user[0] : split.user,
            }));

            setExpenseDetailData({ expense, splits: mappedSplits });
        } catch (err) {
            console.error('Failed to load expense detail', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleExpenseKeyDown = (event: KeyboardEvent<HTMLDivElement>, expense: ExpenseWithPayer) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void openExpenseDetail(expense);
        }
    };

    const closeExpenseDetail = () => {
        setIsExpenseDetailOpen(false);
        setExpenseDetailData(null);
        setDetailLoading(false);
        setDeletingExpenseId(null);
    };

    const handleExpenseEditStart = () => {
        if (!expenseDetailData) return;

        setExpenseToEdit({
            ...expenseDetailData.expense,
            splits: expenseDetailData.splits.map((split) => ({
                user_id: split.user_id,
                amount: split.amount,
            })),
        });
        closeExpenseDetail();
    };

    const handleExpenseEditSuccess = () => {
        setExpenseToEdit(null);
        fetchExpenses();
    };

    const handleExpenseDelete = async () => {
        if (!expenseDetailData) return;
        if (!confirm('Are you sure you want to delete this expense?')) return;

        setDeletingExpenseId(expenseDetailData.expense.id);
        try {
            const { error: deleteSplitsError } = await supabase
                .from('expense_splits')
                .delete()
                .eq('expense_id', expenseDetailData.expense.id);

            if (deleteSplitsError) {
                throw deleteSplitsError;
            }

            const { error: deleteExpenseError } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseDetailData.expense.id);

            if (deleteExpenseError) {
                throw deleteExpenseError;
            }

            closeExpenseDetail();
            fetchExpenses();
        } catch (err) {
            console.error('Failed to delete expense', err);
        } finally {
            setDeletingExpenseId(null);
        }
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

    const isCreator = group.created_by === currentUser.id;

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className={styles.sidebarTitle} style={{ marginBottom: 0 }}>Balances</h3>
                            {isCreator && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="btn btn-ghost btn-xs"
                                    title="Add Member"
                                >
                                    + Add
                                </button>
                            )}
                        </div>

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
                                <div
                                    key={expense.id}
                                    className="expense-item"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => void openExpenseDetail(expense)}
                                    onKeyDown={(event) => handleExpenseKeyDown(event, expense)}
                                >
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
                                            Added by {expense.payer?.full_name || 'Unknown'} •{' '}
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

            {showAddMember && (
                <AddMemberModal
                    groupId={group.id}
                    existingMemberIds={members.map(m => m.id)}
                    onClose={() => setShowAddMember(false)}
                    onAdded={handleMemberAdded}
                />
            )}

            {expenseToEdit && (
                <ExpenseModal
                    groupId={group.id}
                    members={members}
                    currentUserId={currentUser.id}
                    expenseToEdit={expenseToEdit}
                    onClose={() => setExpenseToEdit(null)}
                    onSuccess={handleExpenseEditSuccess}
                />
            )}

            {isExpenseDetailOpen && expenseDetailData && (
                <ExpenseDetailModal
                    expense={expenseDetailData.expense}
                    splits={expenseDetailData.splits}
                    currentUserId={currentUser.id}
                    onClose={closeExpenseDetail}
                    onEdit={handleExpenseEditStart}
                    onDelete={handleExpenseDelete}
                    loading={detailLoading}
                    isDeleting={deletingExpenseId === expenseDetailData.expense.id}
                />
            )}
        </div>
    );
}
