'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import styles from './Modal.module.css';

interface AddMemberModalProps {
    groupId: string;
    existingMemberIds: string[];
    onClose: () => void;
    onAdded: (profile: Profile) => void;
}

export default function AddMemberModal({
    groupId,
    existingMemberIds,
    onClose,
    onAdded,
}: AddMemberModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 1. Find user by email
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email.trim())
                .limit(1);

            if (profileError) throw profileError;

            if (!profiles || profiles.length === 0) {
                setError('User not found. Ask them to sign up for SplitEase properly first!');
                setLoading(false);
                return;
            }

            const profile = profiles[0];

            // 2. Check if already a member
            if (existingMemberIds.includes(profile.id)) {
                setError('User is already a member of this group');
                setLoading(false);
                return;
            }

            // 3. Add to group
            const { error: insertError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupId,
                    profile_id: profile.id,
                });

            if (insertError) {
                if (insertError.code === '42501') {
                    throw new Error('You do not have permission to add members to this group.');
                }
                throw insertError;
            }

            setSuccessMessage(`Successfully added ${profile.full_name}!`);
            onAdded(profile);

            // Clear input for next add
            setEmail('');

        } catch (err) {
            console.error('Add member error:', err);
            setError(err instanceof Error ? err.message : 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Member</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className={styles.error}>{error}</div>}
                        {successMessage && <div className="alert alert-success" style={{
                            padding: '12px',
                            background: '#dcfce7',
                            color: '#166534',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '0.95rem'
                        }}>{successMessage}</div>}

                        <p className={styles.modalDescription} style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
                            Enter the email address of the person you want to add. They must already have an account.
                        </p>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="friend@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
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
                            Done
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !email.trim()}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                    Adding...
                                </>
                            ) : (
                                'Add Member'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
