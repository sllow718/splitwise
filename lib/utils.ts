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
 * Calculate net balances for a group based on expenses and settlements
 */
export function calculateGroupBalances(
    expenses: { payer_id: string; splits: { user_id: string; amount: number }[] }[],
    settlements?: { payer_id: string; payee_id: string; amount: number }[]
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

    // Apply settlements to balances
    if (settlements) {
        for (const settlement of settlements) {
            // Payer paid money, so their balance decreases (they owe less)
            const payerBalance = balances.get(settlement.payer_id) || 0;
            balances.set(settlement.payer_id, payerBalance - settlement.amount);

            // Payee received money, so their balance decreases (they are owed less)
            const payeeBalance = balances.get(settlement.payee_id) || 0;
            balances.set(settlement.payee_id, payeeBalance + settlement.amount);
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

/**
 * Calculate minimum transactions needed to settle all debts
 */
export function calculateMinimumTransactions(
    balances: Map<string, number>
): { from: string; to: string; amount: number }[] {
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    balances.forEach((balance, userId) => {
        if (balance > 0.01) {
            creditors.push({ userId, amount: balance });
        } else if (balance < -0.01) {
            debtors.push({ userId, amount: -balance });
        }
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const amount = Math.min(creditor.amount, debtor.amount);

        if (amount > 0.01) {
            transactions.push({
                from: debtor.userId,
                to: creditor.userId,
                amount: Math.round(amount * 100) / 100,
            });
        }

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
    }

    return transactions;
}
