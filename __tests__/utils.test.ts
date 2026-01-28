import {
    calculateSplits,
    calculateGroupBalances,
    formatCurrency,
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
