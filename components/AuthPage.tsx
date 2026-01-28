'use client';

import { supabase } from '@/lib/supabase';
import styles from './AuthPage.module.css';

export default function AuthPage() {
    const handleGoogleSignIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`,
            },
        });

        if (error) {
            console.error('Error signing in:', error.message);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.gradientOrb1}></div>
                <div className={styles.gradientOrb2}></div>
                <div className={styles.gradientOrb3}></div>
            </div>

            <div className={`glass-card ${styles.card}`}>
                <div className={styles.logo}>
                    <span className={styles.logoIcon}>💰</span>
                    <h1 className={styles.logoText}>SplitEase</h1>
                </div>

                <h2 className={styles.title}>Welcome Back</h2>
                <p className={styles.subtitle}>
                    Split expenses effortlessly with friends, roommates, and travel groups.
                </p>

                <button
                    onClick={handleGoogleSignIn}
                    className={`btn ${styles.googleBtn}`}
                    type="button"
                >
                    <svg className={styles.googleIcon} viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                <p className={styles.terms}>
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>

            <div className={styles.features}>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>👥</span>
                    <h3>Create Groups</h3>
                    <p>Organize expenses by trip, household, or event</p>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>📊</span>
                    <h3>Track Balances</h3>
                    <p>Always know who owes what with real-time updates</p>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>📎</span>
                    <h3>Attach Receipts</h3>
                    <p>Keep proof of expenses with photo uploads</p>
                </div>
            </div>
        </div>
    );
}
