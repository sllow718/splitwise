'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Authentication Error</h1>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                {error || 'There was an issue signing you in. Please try again.'}
            </p>
            <Link href="/" className="btn btn-primary">
                Return Home
            </Link>
        </div>
    );
}
