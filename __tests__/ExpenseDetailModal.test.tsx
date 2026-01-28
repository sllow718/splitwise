'use client';

import { render, screen } from '@testing-library/react';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import type { Profile } from '@/lib/types';

const baseProfile: Profile = {
    id: 'user-123',
    email: 'tester@example.com',
    full_name: 'Primary Person',
    avatar_url: null,
    created_at: new Date().toISOString(),
};

const guestProfile: Profile = {
    id: 'user-456',
    email: 'guest@example.com',
    full_name: 'Other Person',
    avatar_url: null,
    created_at: new Date().toISOString(),
};

const baseExpense = {
    id: 'expense-1',
    group_id: 'group-1',
    payer_id: baseProfile.id,
    description: 'Dinner out',
    amount: 42.5,
    currency: 'USD',
    category: 'food' as const,
    created_at: new Date().toISOString(),
    attachment_url: null,
};

const splits = [
    {
        expense_id: 'expense-1',
        user_id: baseProfile.id,
        amount: 21.25,
        status: 'paid' as const,
        user: baseProfile,
    },
    {
        expense_id: 'expense-1',
        user_id: guestProfile.id,
        amount: 21.25,
        status: 'unpaid' as const,
        user: guestProfile,
    },
];

describe('ExpenseDetailModal', () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('shows expense summary, split list, and management actions for the payer', () => {
        render(
            <ExpenseDetailModal
                expense={baseExpense}
                splits={splits}
                currentUserId={baseProfile.id}
                onClose={onClose}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.getByText('Expense details')).toBeInTheDocument();
        expect(screen.getByText('Dinner out')).toBeInTheDocument();
        expect(screen.getByText('$42.50')).toBeInTheDocument();
        expect(screen.getByText('Split breakdown')).toBeInTheDocument();

        // Each split entry shows user and amount
        expect(screen.getByText(/Primary Person/)).toBeInTheDocument();
        expect(screen.getByText(/Other Person/)).toBeInTheDocument();
        expect(screen.getAllByText('$21.25')).toHaveLength(2);

        // Payer should see edit/delete controls
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('hides management buttons when the viewer is not the payer', () => {
        render(
            <ExpenseDetailModal
                expense={baseExpense}
                splits={splits}
                currentUserId={guestProfile.id}
                onClose={onClose}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        );

        expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('renders loading state when split details are being fetched', () => {
        render(
            <ExpenseDetailModal
                expense={baseExpense}
                splits={[]}
                currentUserId={baseProfile.id}
                onClose={onClose}
                onEdit={onEdit}
                onDelete={onDelete}
                loading
            />
        );

        expect(screen.getByText('Loading split details...')).toBeInTheDocument();
    });
});
