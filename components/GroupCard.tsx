'use client';

import type { Group } from '@/lib/types';
import styles from './GroupCard.module.css';

interface GroupCardProps {
    group: Group;
    onClick: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
    const getCategoryEmoji = (name: string) => {
        const lowName = name.toLowerCase();
        if (lowName.includes('trip') || lowName.includes('travel')) return '✈️';
        if (lowName.includes('home') || lowName.includes('house') || lowName.includes('rent')) return '🏠';
        if (lowName.includes('food') || lowName.includes('dinner') || lowName.includes('lunch')) return '🍽️';
        if (lowName.includes('office') || lowName.includes('work')) return '💼';
        if (lowName.includes('party') || lowName.includes('event')) return '🎉';
        return '👥';
    };

    return (
        <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
            <div className={styles.header}>
                <div className={styles.icon}>{getCategoryEmoji(group.name)}</div>
                <div className={styles.info}>
                    <h3 className={styles.name}>{group.name}</h3>
                    {group.description && (
                        <p className={styles.description}>{group.description}</p>
                    )}
                </div>
            </div>

            <div className={styles.footer}>
                <span className={styles.date}>
                    Created {new Date(group.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </span>
                <span className={styles.arrow}>→</span>
            </div>
        </div>
    );
}
