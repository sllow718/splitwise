'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Group } from '@/lib/types';
import styles from './Modal.module.css';

interface CreateGroupModalProps {
    userId: string;
    onClose: () => void;
    onCreated: (group: Group) => void;
}

export default function CreateGroupModal({
    userId,
    onClose,
    onCreated,
}: CreateGroupModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Create the group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: name.trim(),
                    description: description.trim() || null,
                    created_by: userId,
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // Add creator as a member
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: group.id,
                    profile_id: userId,
                });

            if (memberError) throw memberError;

            onCreated(group);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create New Group</h2>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost btn-icon"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="groupName" className="form-label">
                                Group Name *
                            </label>
                            <input
                                id="groupName"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Trip to Paris, Apartment Expenses"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="groupDescription" className="form-label">
                                Description (optional)
                            </label>
                            <textarea
                                id="groupDescription"
                                className="form-textarea"
                                placeholder="Add a description for your group..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
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
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                    Creating...
                                </>
                            ) : (
                                'Create Group'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
