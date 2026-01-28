import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'SplitEase - Group Expense Tracker',
    description: 'Split expenses easily with friends, roommates, and travel groups.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
