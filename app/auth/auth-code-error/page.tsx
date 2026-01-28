'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// 1. Isolate the logic that needs the search params into its own component
function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
            {error || 'There was an issue signing you in. Please try again.'}
        </p>
    );
}

// 2. Export the main page, wrapping the content in Suspense
export default function AuthErrorPage() {
    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Authentication Error</h1>
            
            <Suspense fallback={<p>Loading error details...</p>}>
                <ErrorContent />
            </Suspense>

            <Link href="/" className="btn btn-primary">
                Return Home
            </Link>
        </div>
    );
}