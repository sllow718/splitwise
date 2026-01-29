'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { KeyboardEvent, ChangeEvent, FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ExpenseSplit, ExpenseWithSplits, Group, Expense, Profile, MinimumTransaction, SettlementWithProfiles } from '@/lib/types';
import { formatCurrency, calculateGroupBalances, calculateMinimumTransactions } from '@/lib/utils';
import { getCategoryIcon, getCategoryColor } from '@/lib/expenseCategory';
import ExpenseDetailModal from './ExpenseDetailModal';
import ExpenseModal from './ExpenseModal';
import AddExpenseModal from './AddExpenseModal';
import AddMemberModal from './AddMemberModal';
import SettleUpModal from './SettleUpModal';
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
    const [settlements, setSettlements] = useState<SettlementWithProfiles[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showSettleUp, setShowSettleUp] = useState(false);
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<Map<string, number>>(new Map());
    const [suggestedTransactions, setSuggestedTransactions] = useState<MinimumTransaction[]>([]);
    const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses');
    const [expenseDetailData, setExpenseDetailData] = useState<ExpenseDetailData | null>(null);
    const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<ExpenseWithSplits | null>(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
    const [groupDetails, setGroupDetails] = useState<Group>(group);
    const [groupEditMode, setGroupEditMode] = useState(false);
    const [editName, setEditName] = useState(group.name);
    const [editDescription, setEditDescription] = useState(group.description || '');
    const [groupImagePreview, setGroupImagePreview] = useState<string | null>(
        group.image_url || null
    );
    const [groupImageUrlInput, setGroupImageUrlInput] = useState(
        group.image_url || ''
    );
    const [groupUpdateStatus, setGroupUpdateStatus] = useState<string | null>(null);
    const [groupUpdateStatusType, setGroupUpdateStatusType] = useState<
        'success' | 'error' | null
    >(null);
    const [groupSaving, setGroupSaving] = useState(false);

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

    const fetchSettlements = useCallback(async () => {
        const { data } = await supabase
            .from('settlements')
            .select(`
        *,
        payer:profiles!payer_id (*),
        payee:profiles!payee_id (*)
      `)
            .eq('group_id', group.id)
            .order('settlement_date', { ascending: false });

        if (data) {
            setSettlements(data.map(settlement => ({
                ...settlement,
                payer: Array.isArray(settlement.payer) ? settlement.payer[0] : settlement.payer,
                payee: Array.isArray(settlement.payee) ? settlement.payee[0] : settlement.payee
            })));
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

            // Fetch splits and settlements to calculate balances
            const expenseIds = data.map(e => e.id);
            if (expenseIds.length > 0) {
                const { data: splits } = await supabase
                    .from('expense_splits')
                    .select('*')
                    .in('expense_id', expenseIds);

                const { data: settlementsData } = await supabase
                    .from('settlements')
                    .select('payer_id, payee_id, amount')
                    .eq('group_id', group.id);

                if (splits) {
                    const expensesWithSplits = data.map(expense => ({
                        payer_id: expense.payer_id,
                        splits: splits
                            .filter(s => s.expense_id === expense.id)
                            .map(s => ({ user_id: s.user_id, amount: s.amount })),
                    }));
                    const calculatedBalances = calculateGroupBalances(
                        expensesWithSplits,
                        settlementsData || []
                    );
                    setBalances(calculatedBalances);
                    setSuggestedTransactions(calculateMinimumTransactions(calculatedBalances));
                }
            } else {
                // Even with no expenses, fetch settlements to calculate balances
                const { data: settlementsData } = await supabase
                    .from('settlements')
                    .select('payer_id, payee_id, amount')
                    .eq('group_id', group.id);

                const calculatedBalances = calculateGroupBalances(
                    [],
                    settlementsData || []
                );
                setBalances(calculatedBalances);
                setSuggestedTransactions(calculateMinimumTransactions(calculatedBalances));
            }
        }
        setLoading(false);
    }, [group.id]);

    const loadedGroupRef = useRef<string | null>(null);

    useEffect(() => {
        if (loadedGroupRef.current === group.id) {
            return;
        }

        loadedGroupRef.current = group.id;
        fetchMembers();
        fetchExpenses();
        fetchSettlements();
    }, [fetchMembers, fetchExpenses, fetchSettlements, group.id]);

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

    useEffect(() => {
        setGroupDetails(group);
        setEditName(group.name);
        setEditDescription(group.description || '');
        setGroupImagePreview(group.image_url || null);
        setGroupImageUrlInput(group.image_url || '');
    }, [group]);

    const handleGroupImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setGroupImagePreview(reader.result as string);
            setGroupImageUrlInput('');
            setGroupUpdateStatus(null);
            setGroupUpdateStatusType(null);
        };
        reader.readAsDataURL(file);
    };

    const handleGroupUpdate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setGroupSaving(true);
        setGroupUpdateStatus(null);
        setGroupUpdateStatusType(null);

        const finalImage = groupImagePreview || groupImageUrlInput.trim() || null;
        const payload = {
            name: editName.trim(),
            description: editDescription.trim() || null,
            image_url: finalImage,
        };

        const { data, error } = await supabase
            .from('groups')
            .update(payload)
            .eq('id', group.id)
            .select('*')
            .single();

        if (error) {
            setGroupUpdateStatusType('error');
            setGroupUpdateStatus(error.message);
            setGroupSaving(false);
            return;
        }

        if (data) {
            setGroupDetails(data);
            setEditName(data.name);
            setEditDescription(data.description || '');
            setGroupImagePreview(data.image_url || null);
            setGroupImageUrlInput(data.image_url || '');
            setGroupUpdateStatusType('success');
            setGroupUpdateStatus('Group details updated.');
            setGroupEditMode(false);
        }

        setGroupSaving(false);
    };

    const displayImage = groupImagePreview || groupDetails.image_url;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerMeta}>
                    <button
                        onClick={onBack}
                        className={`btn btn-ghost ${styles.backBtn}`}
                    >
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
                    <div className={styles.groupHero}>
                        <div className={styles.groupAvatarWrapper}>
                            {displayImage ? (
                                <img
                                    src={displayImage}
                                    alt={`${groupDetails.name} avatar`}
                                    className={styles.groupAvatarImage}
                                />
                            ) : (
                                <div className={styles.groupAvatarPlaceholder}>
                                    {groupDetails.name
                                        .split(' ')
                                        .map((segment) => segment[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </div>
                            )}
                        </div>
                        <div className={styles.groupHeroText}>
                            <h1 className={styles.title}>{groupDetails.name}</h1>
                            {groupDetails.description && (
                                <p className={styles.groupDescription}>
                                    {groupDetails.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        {isCreator && (
                            <button
                                onClick={() =>
                                    setGroupEditMode((mode) => !mode)
                                }
                                className="btn btn-ghost"
                            >
                                {groupEditMode ? 'Cancel edit' : 'Edit group'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddExpense(true)}
                            className="btn btn-primary"
                        >
                            + Add Expense
                        </button>
                    </div>
                </div>
                {groupEditMode && isCreator && (
                    <form
                        className={styles.groupEditForm}
                        onSubmit={handleGroupUpdate}
                    >
                        <div className={styles.groupEditFields}>
                            <label className="form-label" htmlFor="group-name">
                                Group name
                            </label>
                            <input
                                id="group-name"
                                className="form-input"
                                value={editName}
                                onChange={(event) =>
                                    setEditName(event.target.value)
                                }
                                required
                            />
                        </div>
                        <div className={styles.groupEditFields}>
                            <label
                                className="form-label"
                                htmlFor="group-description"
                            >
                                Description
                            </label>
                            <textarea
                                id="group-description"
                                className="form-textarea"
                                rows={2}
                                value={editDescription}
                                onChange={(event) =>
                                    setEditDescription(event.target.value)
                                }
                                placeholder="Optional description"
                            />
                        </div>
                        <div className={styles.groupImageInputs}>
                            <label className="form-label">
                                Group profile image
                            </label>
                            <div className={styles.groupImageControls}>
                                <label className="file-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleGroupImageFileChange}
                                    />
                                    <span className="file-upload-icon">
                                        📷
                                    </span>
                                    <span className="file-upload-text">
                                        Upload image
                                    </span>
                                </label>
                                <input
                                    className="form-input"
                                    type="url"
                                    placeholder="Or paste image URL"
                                    value={groupImageUrlInput}
                                    onChange={(event) => {
                                        setGroupImageUrlInput(event.target.value);
                                        setGroupImagePreview(null);
                                        setGroupUpdateStatus(null);
                                        setGroupUpdateStatusType(null);
                                    }}
                                />
                            </div>
                            {displayImage && (
                                <div className={styles.groupImagePreview}>
                                    <img
                                        src={displayImage}
                                        alt="Preview"
                                        loading="lazy"
                                    />
                                </div>
                            )}
                        </div>
                        <div className={styles.groupEditActions}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={groupSaving}
                            >
                                {groupSaving ? 'Saving…' : 'Save changes'}
                            </button>
                            {groupUpdateStatus && (
                                <p
                                    className={`${styles.groupStatus} ${
                                        groupUpdateStatusType === 'error'
                                            ? styles.statusError
                                            : styles.statusSuccess
                                    }`}
                                >
                                    {groupUpdateStatus}
                                </p>
                            )}
                        </div>
                    </form>
                )}
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
                            <>
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
                                <button
                                    onClick={() => setShowSettleUp(true)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: '16px' }}
                                >
                                    Settle Up
                                </button>
                            </>
                        )}
                    </div>
                </aside>

                <main className={styles.main}>
                    <div className={styles.tabContainer}>
                        <button
                            className={`${styles.tab} ${activeTab === 'expenses' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('expenses')}
                        >
                            Expenses
                            <span className={styles.tabCount}>{expenses.length}</span>
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'settlements' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('settlements')}
                        >
                            Settlements
                            <span className={styles.tabCount}>{settlements.length}</span>
                        </button>
                    </div>

                    {activeTab === 'expenses' ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            {loading ? (
                                <div className={styles.loadingState}>
                                    <div className="spinner"></div>
                                    <p>Loading settlements...</p>
                                </div>
                            ) : settlements.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">💰</div>
                                    <h3 className="empty-state-title">No settlements yet</h3>
                                    <p className="empty-state-text">
                                        Record payments to settle up group balances.
                                    </p>
                                    <button
                                        onClick={() => setShowSettleUp(true)}
                                        className="btn btn-primary"
                                    >
                                        Record Settlement
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.settlementList}>
                                    {settlements.map((settlement) => (
                                        <div key={settlement.id} className={styles.settlementItem}>
                                            <div className={styles.settlementIcon}>💵</div>
                                            <div className={styles.settlementInfo}>
                                                <div className={styles.settlementDescription}>
                                                    <strong>{settlement.payer?.full_name || 'Unknown'}</strong>
                                                    {' paid '}
                                                    <strong>{settlement.payee?.full_name || 'Unknown'}</strong>
                                                </div>
                                                <div className={styles.settlementMeta}>
                                                    {settlement.settlement_date ? (
                                                        new Date(settlement.settlement_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })
                                                    ) : (
                                                        new Date(settlement.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })
                                                    )}
                                                    {settlement.notes && ` • ${settlement.notes}`}
                                                </div>
                                            </div>
                                            <div className={styles.settlementAmount}>
                                                {formatCurrency(settlement.amount, settlement.currency)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
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

            {showSettleUp && (
                <SettleUpModal
                    groupId={group.id}
                    currentUserId={currentUser.id}
                    members={members}
                    suggestedTransactions={suggestedTransactions}
                    onClose={() => setShowSettleUp(false)}
                    onSettled={() => {
                        setShowSettleUp(false);
                        fetchExpenses();
                        fetchSettlements();
                    }}
                />
            )}
        </div>
    );
}
