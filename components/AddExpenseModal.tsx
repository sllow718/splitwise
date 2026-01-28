'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Expense, ExpenseCategory, SplitType } from '@/lib/types';
import { calculateSplits } from '@/lib/utils';
import styles from './Modal.module.css';

interface AddExpenseModalProps {
    groupId: string;
    members: Profile[];
    currentUserId: string;
    onClose: () => void;
    onAdded: (expense: Expense) => void;
}

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
    { value: 'food', label: 'Food', icon: '🍽️' },
    { value: 'transport', label: 'Transport', icon: '🚗' },
    { value: 'rent', label: 'Rent', icon: '🏠' },
    { value: 'utilities', label: 'Utilities', icon: '💡' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'other', label: 'Other', icon: '📦' },
];

export default function AddExpenseModal({
    groupId,
    members,
    currentUserId,
    onClose,
    onAdded,
}: AddExpenseModalProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>('other');
    const [payerId, setPayerId] = useState(currentUserId);
    const [splitType, setSplitType] = useState<SplitType>('equal');
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
    const [selectedMembers, setSelectedMembers] = useState<string[]>(
        members.map((m) => m.id)
    );
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload an image (JPEG, PNG, WebP) or PDF file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }

            setAttachment(file);
            setError(null);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAttachmentPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setAttachmentPreview(null);
            }
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            setError('Description is required');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (selectedMembers.length === 0) {
            setError('Select at least one member to split with');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let attachmentUrl: string | null = null;

            // Upload attachment if present
            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `${groupId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('expense-attachments')
                    .upload(fileName, attachment);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // Continue without attachment if upload fails
                } else {
                    const { data: urlData } = supabase.storage
                        .from('expense-attachments')
                        .getPublicUrl(fileName);
                    attachmentUrl = urlData.publicUrl;
                }
            }

            // Create expense
            const { data: expense, error: expenseError } = await supabase
                .from('expenses')
                .insert({
                    group_id: groupId,
                    payer_id: payerId,
                    description: description.trim(),
                    amount: numAmount,
                    currency: 'USD',
                    category,
                    attachment_url: attachmentUrl,
                })
                .select()
                .single();

            if (expenseError) throw expenseError;

            // Calculate and create splits
            let splits;
            if (splitType === 'equal') {
                splits = calculateSplits(numAmount, selectedMembers, 'equal');
            } else if (splitType === 'percentage') {
                const percentageSplits = selectedMembers.map((userId) => ({
                    user_id: userId,
                    percentage: parseFloat(customSplits[userId] || '0'),
                }));
                splits = calculateSplits(numAmount, selectedMembers, 'percentage', percentageSplits);
            } else {
                const exactSplits = selectedMembers.map((userId) => ({
                    user_id: userId,
                    amount: parseFloat(customSplits[userId] || '0'),
                }));
                splits = calculateSplits(numAmount, selectedMembers, 'exact', exactSplits);
            }

            const { error: splitsError } = await supabase
                .from('expense_splits')
                .insert(
                    splits.map((split) => ({
                        expense_id: expense.id,
                        user_id: split.user_id,
                        amount: split.amount,
                        status: 'unpaid',
                    }))
                );

            if (splitsError) throw splitsError;

            onAdded(expense);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Expense</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className={styles.error}>{error}</div>}

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">
                                Description *
                            </label>
                            <input
                                id="description"
                                type="text"
                                className="form-input"
                                placeholder="What was this expense for?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
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
                                <label htmlFor="category" className="form-label">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    className="form-select"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.icon} {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="payer" className="form-label">
                                Paid by
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
                                        {member.id === currentUserId && ' (You)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Split Type</label>
                            <div className={styles.splitOptions}>
                                {(['equal', 'percentage', 'exact'] as SplitType[]).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`${styles.splitOption} ${splitType === type ? styles.splitOptionActive : ''}`}
                                        onClick={() => setSplitType(type)}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Split Between</label>
                            <div className={styles.membersList}>
                                {members.map((member) => (
                                    <div key={member.id} className={styles.memberRow}>
                                        <div className={styles.memberInfo}>
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.includes(member.id)}
                                                onChange={() => toggleMember(member.id)}
                                                id={`member-${member.id}`}
                                            />
                                            <label htmlFor={`member-${member.id}`} className={styles.memberName}>
                                                {member.full_name}
                                                {member.id === currentUserId && ' (You)'}
                                            </label>
                                        </div>
                                        {splitType !== 'equal' && selectedMembers.includes(member.id) && (
                                            <input
                                                type="number"
                                                step={splitType === 'percentage' ? '1' : '0.01'}
                                                min="0"
                                                placeholder={splitType === 'percentage' ? '%' : '$'}
                                                className={styles.memberInput}
                                                value={customSplits[member.id] || ''}
                                                onChange={(e) =>
                                                    setCustomSplits((prev) => ({
                                                        ...prev,
                                                        [member.id]: e.target.value,
                                                    }))
                                                }
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Attachment (optional)</label>
                            <div className="file-upload">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={handleFileChange}
                                />
                                <div className="file-upload-icon">📎</div>
                                <div className="file-upload-text">
                                    Click or drag to upload a receipt
                                </div>
                            </div>

                            {attachment && (
                                <div className={styles.filePreview}>
                                    {attachmentPreview ? (
                                        <img
                                            src={attachmentPreview}
                                            alt="Preview"
                                            className={styles.filePreviewImage}
                                        />
                                    ) : (
                                        <div className={styles.filePreviewImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)' }}>
                                            📄
                                        </div>
                                    )}
                                    <div className={styles.filePreviewInfo}>
                                        <div className={styles.filePreviewName}>{attachment.name}</div>
                                        <div className={styles.filePreviewSize}>
                                            {formatFileSize(attachment.size)}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeAttachment}
                                        className={styles.removeFile}
                                        aria-label="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
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
                            className="btn btn-success"
                            disabled={loading || !description.trim() || !amount}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                    Adding...
                                </>
                            ) : (
                                'Add Expense'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
