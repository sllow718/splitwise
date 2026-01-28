'use client';

import { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Group, Profile } from '@/lib/types';
import GroupCard from './GroupCard';
import GroupDetail from './GroupDetail';
import CreateGroupModal from './CreateGroupModal';
import styles from './Dashboard.module.css';

type Tab = 'groups' | 'activity' | 'account';

interface DashboardProps {
    user: User;
}

interface ActivityNotification {
    id: string;
    description: string;
    amount: number;
    currency: string;
    groupName: string;
    payerName: string;
    createdAt: string;
}

type SupabaseRelation<T> = T | T[] | null | undefined;

interface ActivityExpenseRow {
    id: string;
    description: string;
    amount: number;
    currency: string | null;
    created_at: string;
    group: SupabaseRelation<{ name: string }>;
    payer: SupabaseRelation<{ full_name: string }>;
}

const extractRelationValue = <T extends Record<string, any>>(
    relation: SupabaseRelation<T>
): T | null => {
    if (!relation) {
        return null;
    }
    if (Array.isArray(relation)) {
        return relation[0] || null;
    }
    return relation;
};

const formatCurrency = (amount: number, currency?: string) => {
    const safeCurrency = currency || 'USD';
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: safeCurrency,
        }).format(amount);
    } catch {
        return `${safeCurrency} ${amount.toFixed(2)}`;
    }
};

const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Just now';
    }
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

export default function Dashboard({ user }: DashboardProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('groups');

    const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [customAvatarUrl, setCustomAvatarUrl] = useState('');
    const [avatarStatus, setAvatarStatus] = useState<string | null>(null);
    const [avatarStatusType, setAvatarStatusType] = useState<
        'success' | 'error' | null
    >(null);
    const [updatingAvatar, setUpdatingAvatar] = useState(false);

    const fetchProfile = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setProfile(data);
        } else {
            const newProfile = {
                id: user.id,
                email: user.email || '',
                full_name:
                    user.user_metadata?.full_name ||
                    user.email?.split('@')[0] ||
                    'User',
                avatar_url: user.user_metadata?.avatar_url || null,
            };
            await supabase.from('profiles').insert(newProfile);
            setProfile(newProfile as Profile);
        }
    }, [user]);

    const fetchGroups = useCallback(async () => {
        const { data } = await supabase
            .from('group_members')
            .select('group:groups (*)')
            .eq('profile_id', user.id);

        if (data) {
            const groupList = data
                .map((item: { group: Group | Group[] | null }) => {
                    const group = item.group;
                    return Array.isArray(group) ? group[0] : group;
                })
                .filter((g): g is Group => g !== null);
            setGroups(groupList);
        }
        setLoadingGroups(false);
    }, [user.id]);

    const fetchActivity = useCallback(async () => {
        if (groups.length === 0) {
            setNotifications([]);
            setActivityLoading(false);
            return;
        }

        setActivityLoading(true);
        const { data } = await supabase
            .from('expenses')
            .select(
                `
                id,
                description,
                amount,
                currency,
                created_at,
                group:groups ( name ),
                payer:profiles ( full_name )
            `
            )
            .in('group_id', groups.map((group) => group.id))
            .order('created_at', { ascending: false })
            .limit(50) as { data: ActivityExpenseRow[] | null };

        if (data) {
            setNotifications(
                data.map((expense) => ({
                    id: expense.id,
                    description: expense.description,
                    amount: Number(expense.amount),
                    currency: expense.currency ?? 'USD',
                    groupName:
                        extractRelationValue(expense.group)?.name || 'Group',
                    payerName:
                        extractRelationValue(expense.payer)?.full_name ||
                        'Someone',
                    createdAt: expense.created_at,
                }))
            );
        }
        setActivityLoading(false);
    }, [groups]);

    const hasLoadedProfileRef = useRef<string | null>(null);

    useEffect(() => {
        if (hasLoadedProfileRef.current === user.id) {
            return;
        }

        hasLoadedProfileRef.current = user.id;
        fetchProfile();
        fetchGroups();
    }, [fetchProfile, fetchGroups, user.id]);

    const activityFetchKeyRef = useRef('');

    useEffect(() => {
        if (loadingGroups) {
            return;
        }

        const groupKey = groups.map((group) => group.id).join(',');
        if (activityFetchKeyRef.current === groupKey) {
            return;
        }

        activityFetchKeyRef.current = groupKey;
        fetchActivity();
    }, [fetchActivity, loadingGroups, groups]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const handleGroupCreated = (newGroup: Group) => {
        setGroups((prev) => [newGroup, ...prev]);
        setShowCreateModal(false);
        setActiveTab('groups');
    };

    const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setAvatarPreview(reader.result as string);
            setCustomAvatarUrl('');
            setAvatarStatus(null);
            setAvatarStatusType(null);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarUpdate = async () => {
        const payload = avatarPreview || customAvatarUrl.trim();
        if (!payload) {
            setAvatarStatus('Choose an image or paste a URL to update your avatar.');
            setAvatarStatusType('error');
            return;
        }

        setUpdatingAvatar(true);
        setAvatarStatus(null);
        setAvatarStatusType(null);
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: payload })
            .eq('id', user.id);

        if (error) {
            setAvatarStatusType('error');
            setAvatarStatus(error.message);
        } else {
            setAvatarStatusType('success');
            setAvatarStatus('Profile image updated.');
            setAvatarPreview(null);
            setCustomAvatarUrl('');
            setProfile((prev) =>
                prev ? { ...prev, avatar_url: payload } : prev
            );
        }
        setUpdatingAvatar(false);
    };

    const navTabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'groups', label: 'Groups', icon: '👥' },
        { id: 'activity', label: 'Activity', icon: '🔔' },
        { id: 'account', label: 'Account', icon: '👤' },
    ];

    const renderGroupsTab = () => (
        <>
            <div className={styles.actionsBar}>
                <h3 className={styles.sectionTitle}>Your Groups</h3>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Group
                </button>
            </div>

            {loadingGroups ? (
                <div className={styles.loadingState}>
                    <div className="spinner"></div>
                    <p>Loading groups...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🧭</div>
                    <h3 className="empty-state-title">No groups yet</h3>
                    <p className="empty-state-text">
                        Create your first group to start tracking shared expenses.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary btn-lg"
                    >
                        Create Your First Group
                    </button>
                </div>
            ) : (
                <div className={styles.groupsGrid}>
                    {groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            onClick={() => {
                                setSelectedGroup(group);
                                setActiveTab('groups');
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    );

    const renderActivityTab = () => (
        <div className={styles.activityContainer}>
            <div className={styles.activityHeader}>
                <div>
                    <h3 className={styles.sectionTitle}>Activity</h3>
                    <p className={styles.activitySubtitle}>
                        Notifications from your groups
                    </p>
                </div>
            </div>

            {activityLoading ? (
                <div className={styles.loadingState}>
                    <div className="spinner"></div>
                    <p>Fetching recent activity...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔕</div>
                    <h3 className="empty-state-title">No recent activity</h3>
                    <p className="empty-state-text">
                        Expenses will appear here as soon as someone adds them to a group.
                    </p>
                </div>
            ) : (
                <ul className={styles.activityList}>
                    {notifications.map((activity) => (
                        <li key={activity.id} className={styles.activityItem}>
                            <div className={styles.activityDetails}>
                                <p className={styles.activityDescription}>
                                    <strong>{activity.payerName}</strong> added{' '}
                                    <span>{activity.description}</span> in{' '}
                                    {activity.groupName}
                                </p>
                                <p className={styles.activityTime}>
                                    {formatDateTime(activity.createdAt)}
                                </p>
                            </div>
                            <div className={styles.activityMeta}>
                                <span className={styles.activityAmount}>
                                    {formatCurrency(activity.amount, activity.currency)}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    const renderAccountTab = () => {
        const avatarToDisplay = avatarPreview || profile?.avatar_url;
        return (
            <div className={styles.accountSection}>
                <header className={styles.accountHeader}>
                    <h3 className={styles.sectionTitle}>Account</h3>
                    <p className={styles.activitySubtitle}>
                        Update your profile image and details
                    </p>
                </header>

                <div className={styles.accountCard}>
                    <div className={styles.accountAvatarWrapper}>
                        {avatarToDisplay ? (
                            <img
                                src={avatarToDisplay}
                                alt="Profile avatar"
                                className={styles.accountAvatarImage}
                            />
                        ) : (
                            <div className={styles.accountAvatarPlaceholder}>
                                {profile?.full_name
                                    ? profile.full_name
                                          .split(' ')
                                          .map((segment) => segment[0])
                                          .join('')
                                          .toUpperCase()
                                          .slice(0, 2)
                                    : 'U'}
                            </div>
                        )}
                        <p className={styles.accountAvatarLabel}>Profile Image</p>
                    </div>

                    <div className={styles.accountMeta}>
                        <p className="font-medium">
                            Signed in as {profile?.email || user.email}
                        </p>
                        <p className="text-muted">
                            Update the avatar that appears across SplitEase.
                        </p>
                    </div>

                    <form
                        className={styles.accountForm}
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleAvatarUpdate();
                        }}
                    >
                        <label className="file-upload">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileChange}
                            />
                            <span className="file-upload-icon">📷</span>
                            <span className="file-upload-text">
                                Upload a new image
                            </span>
                        </label>

                        <div className={styles.accountUrlInput}>
                            <input
                                type="url"
                                value={customAvatarUrl}
                                onChange={(event) => {
                                    setCustomAvatarUrl(event.target.value);
                                    setAvatarPreview(null);
                                    setAvatarStatus(null);
                                }}
                                placeholder="Paste an image URL (optional)"
                                className="form-input"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={
                                updatingAvatar ||
                                (!avatarPreview &&
                                    customAvatarUrl.trim().length === 0)
                            }
                        >
                            {updatingAvatar
                                ? 'Saving...'
                                : 'Update profile image'}
                        </button>

                        {avatarStatus && (
                            <p
                                className={`${styles.accountStatus} ${
                                    avatarStatusType === 'error'
                                        ? styles.accountStatusError
                                        : ''
                                }`}
                            >
                                {avatarStatus}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        );
    };

    if (selectedGroup) {
        return (
            <GroupDetail
                group={selectedGroup}
                currentUser={user}
                onBack={() => {
                    setSelectedGroup(null);
                    setActiveTab('groups');
                }}
            />
        );
    }

    const renderActiveTab = () => {
        if (activeTab === 'activity') {
            return renderActivityTab();
        }
        if (activeTab === 'account') {
            return renderAccountTab();
        }
        return renderGroupsTab();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>💼</span>
                        <h1 className={styles.logoText}>SplitEase</h1>
                    </div>

                    <div className={styles.userMenu}>
                        <div className={styles.userInfo}>
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className={styles.avatar}
                                />
                            ) : (
                                <div className={`avatar ${styles.avatar}`}>
                                    {profile?.full_name
                                        ? profile.full_name
                                              .split(' ')
                                              .map((segment) => segment[0])
                                              .join('')
                                              .toUpperCase()
                                              .slice(0, 2)
                                        : 'U'}
                                </div>
                            )}
                            <span className={styles.userName}>
                                {profile?.full_name ||
                                    user.user_metadata?.full_name ||
                                    user.email?.split('@')[0] ||
                                    'You'}
                            </span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="btn btn-ghost btn-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>{renderActiveTab()}</main>

            <nav className={styles.bottomNav} aria-label="Mobile navigation">
                {navTabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`${styles.navItem} ${
                            activeTab === tab.id ? styles.navItemActive : ''
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                    >
                        <span className={styles.navIcon}>{tab.icon}</span>
                        <span className={styles.navLabel}>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {showCreateModal && (
                <CreateGroupModal
                    userId={user.id}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleGroupCreated}
                />
            )}
        </div>
    );
}
