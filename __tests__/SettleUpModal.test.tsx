'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettleUpModal from '../components/SettleUpModal';
import type { Profile, MinimumTransaction } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

const mockProfile1: Profile = {
    id: 'user-1',
    email: 'alice@example.com',
    full_name: 'Alice Smith',
    avatar_url: null,
    created_at: new Date().toISOString(),
};

const mockProfile2: Profile = {
    id: 'user-2',
    email: 'bob@example.com',
    full_name: 'Bob Jones',
    avatar_url: null,
    created_at: new Date().toISOString(),
};

const mockProfile3: Profile = {
    id: 'user-3',
    email: 'charlie@example.com',
    full_name: 'Charlie Brown',
    avatar_url: null,
    created_at: new Date().toISOString(),
};

const mockSuggestedTransactions: MinimumTransaction[] = [
    { from: 'user-2', to: 'user-1', amount: 50 },
    { from: 'user-3', to: 'user-1', amount: 30 },
];

describe('SettleUpModal', () => {
    const mockOnClose = jest.fn();
    const mockOnSettled = jest.fn();
    const groupId = 'group-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders modal with title and form fields', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2, mockProfile3]}
                suggestedTransactions={mockSuggestedTransactions}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        expect(screen.getByText('Settle Up')).toBeInTheDocument();
        expect(screen.getByLabelText(/Who paid/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Who received payment/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    });

    it('displays suggested transactions when provided', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2, mockProfile3]}
                suggestedTransactions={mockSuggestedTransactions}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        expect(screen.getByText('Suggested Settlements')).toBeInTheDocument();
        expect(screen.getByText(/Bob Jones pays Alice Smith/)).toBeInTheDocument();
        expect(screen.getByText(/Charlie Brown pays Alice Smith/)).toBeInTheDocument();
        expect(screen.getByText('$50.00')).toBeInTheDocument();
        expect(screen.getByText('$30.00')).toBeInTheDocument();
    });

    it('does not display suggested transactions section when empty', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        expect(screen.queryByText('Suggested Settlements')).not.toBeInTheDocument();
    });

    it('applies suggested transaction when clicked', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2, mockProfile3]}
                suggestedTransactions={mockSuggestedTransactions}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const suggestionButtons = screen.getAllByRole('button', {
            name: /Bob Jones pays Alice Smith/,
        });
        fireEvent.click(suggestionButtons[0]);

        const payerSelect = screen.getByLabelText(/Who paid/) as HTMLSelectElement;
        const payeeSelect = screen.getByLabelText(/Who received payment/) as HTMLSelectElement;
        const amountInput = screen.getByLabelText(/Amount/) as HTMLInputElement;

        expect(payerSelect.value).toBe('user-2');
        expect(payeeSelect.value).toBe('user-1');
        expect(amountInput.value).toBe('50.00');
    });

    it('defaults payer to current user', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payerSelect = screen.getByLabelText(/Who paid/) as HTMLSelectElement;
        expect(payerSelect.value).toBe(mockProfile1.id);
    });

    it('filters payee options to exclude selected payer', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2, mockProfile3]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/) as HTMLSelectElement;
        const options = Array.from(payeeSelect.options).map(opt => opt.value);

        // Should not include the payer (user-1) in payee options
        expect(options).not.toContain('user-1');
        expect(options).toContain('user-2');
        expect(options).toContain('user-3');
    });

    it('shows validation error when payee is not selected', async () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Please select who received the payment')).toBeInTheDocument();
        });
    });

    it('shows validation error for invalid amount', async () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '-5' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
        });
    });

    it('shows validation error when payer and payee are the same', async () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payerSelect = screen.getByLabelText(/Who paid/);
        const payeeSelect = screen.getByLabelText(/Who received payment/);
        const amountInput = screen.getByLabelText(/Amount/);

        fireEvent.change(payerSelect, { target: { value: 'user-1' } });
        fireEvent.change(payeeSelect, { target: { value: 'user-1' } });
        fireEvent.change(amountInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Payer and payee must be different')).toBeInTheDocument();
        });
    });

    it('successfully submits settlement and calls onSettled', async () => {
        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
            insert: mockInsert,
        });

        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '75.50' } });

        const notesInput = screen.getByLabelText(/Notes/);
        fireEvent.change(notesInput, { target: { value: 'Payment for dinner' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith({
                group_id: groupId,
                payer_id: mockProfile1.id,
                payee_id: 'user-2',
                amount: 75.50,
                currency: 'USD',
                notes: 'Payment for dinner',
            });
            expect(mockOnSettled).toHaveBeenCalled();
        });
    });

    it('handles submission with empty notes', async () => {
        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
            insert: mockInsert,
        });

        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '100' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith({
                group_id: groupId,
                payer_id: mockProfile1.id,
                payee_id: 'user-2',
                amount: 100,
                currency: 'USD',
                notes: null,
            });
        });
    });

    it('displays error message on submission failure', async () => {
        const mockInsert = jest.fn().mockResolvedValue({
            error: new Error('Database connection failed'),
        });
        (supabase.from as jest.Mock).mockReturnValue({
            insert: mockInsert,
        });

        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Database connection failed')).toBeInTheDocument();
        });

        expect(mockOnSettled).not.toHaveBeenCalled();
    });

    it('disables submit button during submission', async () => {
        const mockInsert = jest.fn().mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
        );
        (supabase.from as jest.Mock).mockReturnValue({
            insert: mockInsert,
        });

        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        fireEvent.click(submitButton);

        // Button should be disabled during submission
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Recording...')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockOnSettled).toHaveBeenCalled();
        });
    });

    it('calls onClose when close button is clicked', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const closeButton = screen.getByRole('button', { name: /Close/ });
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel button is clicked', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables submit button when required fields are empty', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        expect(submitButton).toBeDisabled();
    });

    it('enables submit button when all required fields are filled', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payeeSelect = screen.getByLabelText(/Who received payment/);
        fireEvent.change(payeeSelect, { target: { value: 'user-2' } });

        const amountInput = screen.getByLabelText(/Amount/);
        fireEvent.change(amountInput, { target: { value: '50' } });

        const submitButton = screen.getByRole('button', { name: /Record Payment/ });
        expect(submitButton).not.toBeDisabled();
    });

    it('shows "(You)" label for current user in dropdowns', () => {
        render(
            <SettleUpModal
                groupId={groupId}
                currentUserId={mockProfile1.id}
                members={[mockProfile1, mockProfile2, mockProfile3]}
                suggestedTransactions={[]}
                onClose={mockOnClose}
                onSettled={mockOnSettled}
            />
        );

        const payerSelect = screen.getByLabelText(/Who paid/);
        expect(payerSelect.innerHTML).toContain('Alice Smith (You)');
    });
});
