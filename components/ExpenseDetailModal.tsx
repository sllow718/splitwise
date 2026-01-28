'use client';

import { formatCurrency } from '@/lib/utils';
import { getCategoryIcon, getCategoryColor } from '@/lib/expenseCategory';
import type { Expense, ExpenseSplit, Profile } from '@/lib/types';
import styles from './ExpenseDetailModal.module.css';

interface ExpenseWithPayer extends Expense {
    payer?: Profile | Profile[] | null;
}

interface ExpenseSplitWithUser extends ExpenseSplit {
    user?: Profile | Profile[] | null;
}

interface ExpenseDetailModalProps {
    expense: ExpenseWithPayer;
    splits: ExpenseSplitWithUser[];
    currentUserId: string;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    loading?: boolean;
    isDeleting?: boolean;
}

export default function ExpenseDetailModal({
    expense,
    splits,
    currentUserId,
    onClose,
    onEdit,
    onDelete,
    loading = false,
    isDeleting = false,
}: ExpenseDetailModalProps) {
    const canManage = expense.payer_id === currentUserId;

    const createdAt = new Date(expense.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const renderSplitName = (split: ExpenseSplitWithUser) => {
        const user = Array.isArray(split.user) ? split.user[0] : split.user;
        return (user?.full_name || 'Unknown') + (split.user_id === currentUserId ? ' (You)' : '');
    };

    const formattedAmount = formatCurrency(expense.amount, expense.currency);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 640 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Expense details</h2>
                    <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className={styles.container}>
                        <div className={styles.detailHeader}>
                            <div
                                className={styles.categoryIcon}
                                style={{ background: getCategoryColor(expense.category) }}
                            >
                                {getCategoryIcon(expense.category)}
                            </div>
                            <div className={styles.detailTitle}>
                                <p className={styles.description}>{expense.description}</p>
                                <p className={styles.meta}>
                                    Paid by {expense.payer?.full_name || 'Unknown'} • {createdAt}
                                </p>
                            </div>
                        </div>

                        <div className={styles.amountRow}>
                            <span className={styles.amountValue}>{formattedAmount}</span>
                            <span className={`badge badge-${expense.category === 'food' ? 'warning' : 'primary'}`}>
                                {expense.category}
                            </span>
                        </div>

                        {expense.attachment_url && (
                            <div className={styles.attachmentRow}>
                                <span className={styles.attachmentLabel}>Receipt</span>
                                <a
                                    className={styles.attachmentLink}
                                    href={expense.attachment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View receipt
                                </a>
                            </div>
                        )}

                        <div className={styles.splitSection}>
                            <div className={styles.splitHeader}>Split breakdown</div>
                            {loading ? (
                                <div className={styles.loadingWrapper}>
                                    <div className="spinner"></div>
                                    <span>Loading split details...</span>
                                </div>
                            ) : splits.length === 0 ? (
                                <p className={styles.emptyText}>No split data available.</p>
                            ) : (
                                <ul className={styles.splitList}>
                                    {splits.map((split) => (
                                        <li key={`${split.user_id}-${split.amount}`} className={styles.splitItem}>
                                            <div className={styles.splitName}>{renderSplitName(split)}</div>
                                            <div className={styles.splitMeta}>
                                                <span className={styles.splitAmount}>
                                                    {formatCurrency(split.amount, expense.currency)}
                                                </span>
                                                <span
                                                    className={`badge ${
                                                        split.status === 'paid' ? 'badge-success' : 'badge-warning'
                                                    } ${styles.splitStatus}`}
                                                >
                                                    {split.status === 'paid' ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        Close
                    </button>
                    {canManage && (
                        <button type="button" className="btn btn-secondary" onClick={onEdit}>
                            Edit
                        </button>
                    )}
                    {canManage && (
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={onDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
