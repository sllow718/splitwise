'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Group, Profile } from '@/lib/types';
import GroupCard from './GroupCard';
import GroupDetail from './GroupDetail';
import CreateGroupModal from './CreateGroupModal';
import styles from './Dashboard.module.css';

interface DashboardProps {
    user: User;
}

export default function Dashboard({ user }: DashboardProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setProfile(data);
        } else {
            // Create profile if doesn't exist
            const newProfile = {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                avatar_url: user.user_metadata?.avatar_url || null,
            };
            await supabase.from('profiles').insert(newProfile);
            setProfile(newProfile as Profile);
        }
    }, [user]);

    const fetchGroups = useCallback(async () => {
        const { data } = await supabase
            .from('group_members')
            .select(`
        group:groups (*)
      `)
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
        setLoading(false);
    }, [user.id]);

    useEffect(() => {
        fetchProfile();
        fetchGroups();
    }, [fetchProfile, fetchGroups]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const handleGroupCreated = (newGroup: Group) => {
        setGroups([newGroup, ...groups]);
        setShowCreateModal(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (selectedGroup) {
        return (
            <GroupDetail
                group={selectedGroup}
                currentUser={user}
                onBack={() => setSelectedGroup(null)}
            />
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>💰</span>
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
                                    {getInitials(profile?.full_name || 'U')}
                                </div>
                            )}
                            <span className={styles.userName}>{profile?.full_name}</span>
                        </div>
                        <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.welcomeSection}>
                    <h2 className={styles.welcomeTitle}>
                        Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
                    </h2>
                    <p className={styles.welcomeSubtitle}>
                        Manage your shared expenses and settle up with friends.
                    </p>
                </div>

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

                {loading ? (
                    <div className={styles.loadingState}>
                        <div className="spinner"></div>
                        <p>Loading groups...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
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
                                onClick={() => setSelectedGroup(group)}
                            />
                        ))}
                    </div>
                )}
            </main>

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
