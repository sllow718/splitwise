import { SplitType } from './types';

/**
 * Calculate expense splits based on split type
 */
export function calculateSplits(
    totalAmount: number,
    memberIds: string[],
    splitType: SplitType,
    customSplits?: { user_id: string; amount?: number; percentage?: number }[]
): { user_id: string; amount: number }[] {
    if (memberIds.length === 0) {
        throw new Error('At least one member is required');
    }

    if (totalAmount <= 0) {
        throw new Error('Amount must be positive');
    }

    switch (splitType) {
        case 'equal':
            return calculateEqualSplit(totalAmount, memberIds);
        case 'percentage':
            return calculatePercentageSplit(totalAmount, customSplits || []);
        case 'exact':
            return calculateExactSplit(totalAmount, customSplits || []);
        default:
            throw new Error(`Unknown split type: ${splitType}`);
    }
}

/**
 * Split amount equally among all members
 */
function calculateEqualSplit(
    totalAmount: number,
    memberIds: string[]
): { user_id: string; amount: number }[] {
    const perPerson = Math.floor((totalAmount * 100) / memberIds.length) / 100;
    const remainder = Math.round((totalAmount - perPerson * memberIds.length) * 100) / 100;

    return memberIds.map((user_id, index) => ({
        user_id,
        // Add remainder to first person to ensure total matches
        amount: index === 0 ? perPerson + remainder : perPerson,
    }));
}

/**
 * Split amount by specified percentages
 */
function calculatePercentageSplit(
    totalAmount: number,
    splits: { user_id: string; percentage?: number }[]
): { user_id: string; amount: number }[] {
    const totalPercentage = splits.reduce((sum, s) => sum + (s.percentage || 0), 0);

    if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentages must sum to 100');
    }

    return splits.map((split) => ({
        user_id: split.user_id,
        amount: Math.round(totalAmount * (split.percentage || 0)) / 100,
    }));
}

/**
 * Split amount by exact amounts specified
 */
function calculateExactSplit(
    totalAmount: number,
    splits: { user_id: string; amount?: number }[]
): { user_id: string; amount: number }[] {
    const totalSplitAmount = splits.reduce((sum, s) => sum + (s.amount || 0), 0);

    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
        throw new Error('Split amounts must equal total amount');
    }

    return splits.map((split) => ({
        user_id: split.user_id,
        amount: split.amount || 0,
    }));
}

/**
 * Calculate net balances for a group based on expenses
 */
export function calculateGroupBalances(
    expenses: { payer_id: string; splits: { user_id: string; amount: number }[] }[]
): Map<string, number> {
    const balances = new Map<string, number>();

    for (const expense of expenses) {
        // Payer gets credited the full amount they paid
        const currentPayerBalance = balances.get(expense.payer_id) || 0;
        const totalExpense = expense.splits.reduce((sum, s) => sum + s.amount, 0);
        balances.set(expense.payer_id, currentPayerBalance + totalExpense);

        // Each person in the split owes their portion
        for (const split of expense.splits) {
            const currentBalance = balances.get(split.user_id) || 0;
            balances.set(split.user_id, currentBalance - split.amount);
        }
    }

    return balances;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
