import type { MinimumTransaction } from './types';

export function calculateMinimumTransactions(
    balances: Map<string, number>
): MinimumTransaction[] {
    const transactions: MinimumTransaction[] = [];
    
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];
    
    for (const [userId, balance] of balances.entries()) {
        const roundedBalance = Math.round(balance * 100) / 100;
        if (roundedBalance > 0.01) {
            creditors.push({ userId, amount: roundedBalance });
        } else if (roundedBalance < -0.01) {
            debtors.push({ userId, amount: -roundedBalance });
        }
    }
    
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    let i = 0;
    let j = 0;
    
    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        
        const settleAmount = Math.min(creditor.amount, debtor.amount);
        
        transactions.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: Math.round(settleAmount * 100) / 100,
        });
        
        creditor.amount -= settleAmount;
        debtor.amount -= settleAmount;
        
        if (creditor.amount < 0.01) {
            i++;
        }
        if (debtor.amount < 0.01) {
            j++;
        }
    }
    
    return transactions;
}
