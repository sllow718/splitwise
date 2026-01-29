import {
    calculateSplits,
    calculateGroupBalances,
    formatCurrency,
    calculateMinimumTransactions,
} from '@/lib/utils';

describe('calculateSplits', () => {
    describe('equal split', () => {
        it('should split amount equally among members', () => {
            const result = calculateSplits(100, ['user1', 'user2'], 'equal');
            expect(result).toHaveLength(2);
            expect(result[0].amount + result[1].amount).toBe(100);
        });

        it('should handle uneven splits correctly', () => {
            const result = calculateSplits(100, ['user1', 'user2', 'user3'], 'equal');
            expect(result).toHaveLength(3);
            // 100 / 3 = 33.33... so we expect rounding
            const total = result.reduce((sum, s) => sum + s.amount, 0);
            expect(total).toBeCloseTo(100, 2);
        });

        it('should throw error for empty members list', () => {
            expect(() => calculateSplits(100, [], 'equal')).toThrow(
                'At least one member is required'
            );
        });

        it('should throw error for zero or negative amount', () => {
            expect(() => calculateSplits(0, ['user1'], 'equal')).toThrow(
                'Amount must be positive'
            );
            expect(() => calculateSplits(-50, ['user1'], 'equal')).toThrow(
                'Amount must be positive'
            );
        });
    });

    describe('percentage split', () => {
        it('should split by percentages correctly', () => {
            const result = calculateSplits(100, ['user1', 'user2'], 'percentage', [
                { user_id: 'user1', percentage: 60 },
                { user_id: 'user2', percentage: 40 },
            ]);
            expect(result.find((r) => r.user_id === 'user1')?.amount).toBe(60);
            expect(result.find((r) => r.user_id === 'user2')?.amount).toBe(40);
        });

        it('should throw error if percentages do not sum to 100', () => {
            expect(() =>
                calculateSplits(100, ['user1', 'user2'], 'percentage', [
                    { user_id: 'user1', percentage: 60 },
                    { user_id: 'user2', percentage: 30 },
                ])
            ).toThrow('Percentages must sum to 100');
        });
    });

    describe('exact split', () => {
        it('should use exact amounts provided', () => {
            const result = calculateSplits(100, ['user1', 'user2'], 'exact', [
                { user_id: 'user1', amount: 70 },
                { user_id: 'user2', amount: 30 },
            ]);
            expect(result.find((r) => r.user_id === 'user1')?.amount).toBe(70);
            expect(result.find((r) => r.user_id === 'user2')?.amount).toBe(30);
        });

        it('should throw error if amounts do not match total', () => {
            expect(() =>
                calculateSplits(100, ['user1', 'user2'], 'exact', [
                    { user_id: 'user1', amount: 70 },
                    { user_id: 'user2', amount: 20 },
                ])
            ).toThrow('Split amounts must equal total amount');
        });
    });
});

describe('calculateGroupBalances', () => {
    it('should return empty map for no expenses', () => {
        const result = calculateGroupBalances([]);
        expect(result.size).toBe(0);
    });

    it('should calculate correct balance for single expense', () => {
        const expenses = [
            {
                payer_id: 'user1',
                splits: [
                    { user_id: 'user1', amount: 50 },
                    { user_id: 'user2', amount: 50 },
                ],
            },
        ];
        const result = calculateGroupBalances(expenses);
        // user1 paid 100, owes 50, so net +50 (is owed 50)
        expect(result.get('user1')).toBe(50);
        // user2 paid 0, owes 50, so net -50 (owes 50)
        expect(result.get('user2')).toBe(-50);
    });

    it('should calculate correct balances for multiple expenses', () => {
        const expenses = [
            {
                payer_id: 'user1',
                splits: [
                    { user_id: 'user1', amount: 50 },
                    { user_id: 'user2', amount: 50 },
                ],
            },
            {
                payer_id: 'user2',
                splits: [
                    { user_id: 'user1', amount: 30 },
                    { user_id: 'user2', amount: 30 },
                ],
            },
        ];
        const result = calculateGroupBalances(expenses);
        // user1: paid 100, owes 50+30=80, net = +100-80 = +20
        // Actually: first expense payer gets +100, then -50 for their share = +50
        // second expense: -30 for their share
        // Total user1: +50 - 30 = +20
        expect(result.get('user1')).toBe(20);
        // user2: first expense -50, second expense +60-30 = +30
        // Total user2: -50 + 30 = -20
        expect(result.get('user2')).toBe(-20);
    });
});

describe('formatCurrency', () => {
    it('should format USD correctly', () => {
        expect(formatCurrency(100, 'USD')).toBe('$100.00');
    });

    it('should format decimal amounts', () => {
        expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
    });

    it('should default to USD', () => {
        expect(formatCurrency(50)).toBe('$50.00');
    });
});

describe('calculateMinimumTransactions', () => {
    it('should return empty array when all balances are zero', () => {
        const balances = new Map([
            ['user1', 0],
            ['user2', 0],
            ['user3', 0],
        ]);
        const result = calculateMinimumTransactions(balances);
        expect(result).toHaveLength(0);
    });

    it('should return empty array for empty balances', () => {
        const balances = new Map();
        const result = calculateMinimumTransactions(balances);
        expect(result).toHaveLength(0);
    });

    it('should calculate single transaction for two users', () => {
        const balances = new Map([
            ['user1', 50], // is owed 50
            ['user2', -50], // owes 50
        ]);
        const result = calculateMinimumTransactions(balances);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            from: 'user2',
            to: 'user1',
            amount: 50,
        });
    });

    it('should calculate minimum transactions for three users', () => {
        const balances = new Map([
            ['user1', 100], // is owed 100
            ['user2', -50], // owes 50
            ['user3', -50], // owes 50
        ]);
        const result = calculateMinimumTransactions(balances);
        expect(result).toHaveLength(2);
        
        // Verify total amounts match
        const totalFrom = result.reduce((sum, t) => sum + t.amount, 0);
        expect(totalFrom).toBe(100);
        
        // All transactions should be from debtors to creditor
        expect(result.every(t => t.to === 'user1')).toBe(true);
        expect(result.map(t => t.from).sort()).toEqual(['user2', 'user3']);
    });

    it('should calculate minimum transactions for complex scenario', () => {
        const balances = new Map([
            ['user1', 30], // is owed 30
            ['user2', 20], // is owed 20
            ['user3', -30], // owes 30
            ['user4', -20], // owes 20
        ]);
        const result = calculateMinimumTransactions(balances);
        
        // Should optimize to minimize transaction count
        expect(result.length).toBeLessThanOrEqual(3); // Maximum n-1 transactions
        
        // Verify balances are settled
        const settlements = new Map<string, number>();
        result.forEach(t => {
            settlements.set(t.from, (settlements.get(t.from) || 0) + t.amount);
            settlements.set(t.to, (settlements.get(t.to) || 0) - t.amount);
        });
        
        // After transactions, debtors should pay out their debt
        expect(settlements.get('user3')).toBeCloseTo(30, 2);
        expect(settlements.get('user4')).toBeCloseTo(20, 2);
    });

    it('should handle one creditor and multiple debtors', () => {
        const balances = new Map([
            ['user1', 150], // is owed 150
            ['user2', -50], // owes 50
            ['user3', -70], // owes 70
            ['user4', -30], // owes 30
        ]);
        const result = calculateMinimumTransactions(balances);
        
        expect(result).toHaveLength(3);
        expect(result.every(t => t.to === 'user1')).toBe(true);
        
        const totalAmount = result.reduce((sum, t) => sum + t.amount, 0);
        expect(totalAmount).toBeCloseTo(150, 2);
    });

    it('should handle multiple creditors and one debtor', () => {
        const balances = new Map([
            ['user1', 50], // is owed 50
            ['user2', 70], // is owed 70
            ['user3', 30], // is owed 30
            ['user4', -150], // owes 150
        ]);
        const result = calculateMinimumTransactions(balances);
        
        expect(result).toHaveLength(3);
        expect(result.every(t => t.from === 'user4')).toBe(true);
        
        const totalAmount = result.reduce((sum, t) => sum + t.amount, 0);
        expect(totalAmount).toBeCloseTo(150, 2);
    });

    it('should round amounts to 2 decimal places', () => {
        const balances = new Map([
            ['user1', 33.333333],
            ['user2', -33.333333],
        ]);
        const result = calculateMinimumTransactions(balances);
        
        expect(result).toHaveLength(1);
        expect(result[0].amount).toBe(33.33);
    });

    it('should ignore balances smaller than 0.01', () => {
        const balances = new Map([
            ['user1', 50],
            ['user2', 0.005], // Too small, should be ignored
            ['user3', -50],
            ['user4', -0.005], // Too small, should be ignored
        ]);
        const result = calculateMinimumTransactions(balances);
        
        // Should only have transaction between user1 and user3
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            from: 'user3',
            to: 'user1',
            amount: 50,
        });
    });

    it('should optimize transaction count for complex group', () => {
        const balances = new Map([
            ['alice', 120],
            ['bob', -45],
            ['charlie', -30],
            ['diana', -25],
            ['eve', -20],
        ]);
        const result = calculateMinimumTransactions(balances);
        
        // Should use greedy algorithm to minimize transactions
        expect(result.length).toBeLessThanOrEqual(4); // n-1 transactions max
        
        // Verify all debts are settled
        const totalPaid = result.reduce((sum, t) => sum + t.amount, 0);
        expect(totalPaid).toBeCloseTo(120, 2);
        
        // All transactions should flow to alice
        expect(result.every(t => t.to === 'alice')).toBe(true);
    });
});
