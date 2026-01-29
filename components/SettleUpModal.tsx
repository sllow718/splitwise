'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, MinimumTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import styles from './Modal.module.css';

interface SettleUpModalProps {
    groupId: string;
    currentUserId: string;
    members: Profile[];
    suggestedTransactions: MinimumTransaction[];
    onClose: () => void;
    onSettled: () => void;
}

export default function SettleUpModal({
    groupId,
    currentUserId,
    members,
    suggestedTransactions,
    onClose,
    onSettled,
}: SettleUpModalProps) {
    const [payerId, setPayerId] = useState(currentUserId);
    const [payeeId, setPayeeId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [settlementDate, setSettlementDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUserName = (userId: string) => {
        const member = members.find((m) => m.id === userId);
        return member ? member.full_name : 'Unknown';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!payeeId) {
            setError('Please select who received the payment');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (payerId === payeeId) {
            setError('Payer and payee must be different');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase.from('settlements').insert({
                group_id: groupId,
                payer_id: payerId,
                payee_id: payeeId,
                amount: numAmount,
                currency: 'USD',
                notes: notes.trim() || null,
                settlement_date: settlementDate,
            });

            if (insertError) {
                throw insertError;
            }

            onSettled();
        } catch (err) {
            console.error('Settlement error', err);
            setError(err instanceof Error ? err.message : 'Failed to record settlement');
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = (transaction: MinimumTransaction) => {
        setPayerId(transaction.from);
        setPayeeId(transaction.to);
        setAmount(transaction.amount.toFixed(2));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Settle Up</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className={styles.error}>{error}</div>}

                        {suggestedTransactions.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Suggested Settlements</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                                    {suggestedTransactions.map((transaction, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => applySuggestion(transaction)}
                                            className="btn btn-ghost"
                                            style={{
                                                justifyContent: 'flex-start',
                                                textAlign: 'left',
                                                padding: 'var(--spacing-3)',
                                                background: 'var(--color-bg-primary)',
                                                borderRadius: 'var(--radius-md)',
                                            }}
                                        >
                                            <span style={{ flex: 1 }}>
                                                {getUserName(transaction.from)} pays{' '}
                                                {getUserName(transaction.to)}
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color: 'var(--color-success)',
                                                }}
                                            >
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="payer" className="form-label">
                                Who paid? *
                            </label>
                            <select
                                id="payer"
                                className="form-select"
                                value={payerId}
                                onChange={(e) => setPayerId(e.target.value)}
                            >
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.full_name}
                                        {member.id === currentUserId ? ' (You)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="payee" className="form-label">
                                Who received payment? *
                            </label>
                            <select
                                id="payee"
                                className="form-select"
                                value={payeeId}
                                onChange={(e) => setPayeeId(e.target.value)}
                            >
                                <option value="">Select a member</option>
                                {members
                                    .filter((member) => member.id !== payerId)
                                    .map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.full_name}
                                            {member.id === currentUserId ? ' (You)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">
                                Amount *
                            </label>
                            <input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="settlement-date" className="form-label">
                                Settlement Date *
                            </label>
                            <input
                                id="settlement-date"
                                type="date"
                                className="form-input"
                                value={settlementDate}
                                onChange={(e) => setSettlementDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="notes" className="form-label">
                                Notes (optional)
                            </label>
                            <textarea
                                id="notes"
                                className="form-textarea"
                                rows={3}
                                placeholder="Add any notes about this payment..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !payeeId || !amount}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                    Recording...
                                </>
                            ) : (
                                'Record Payment'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
