import type { ExpenseCategory } from './types';

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
    food: '🍽️',
    transport: '🚗',
    rent: '🏠 ',
    utilities: '💡',
    entertainment: '🎊',
    other: '📦',
};

//     { value: 'food', label: 'Food', icon: '🍽️' },
//     { value: 'transport', label: 'Transport', icon: '🚗' },
//     { value: 'rent', label: 'Rent', icon: '🏠' },
//     { value: 'utilities', label: 'Utilities', icon: '💡' },
//     { value: 'entertainment', label: 'Entertainment', icon: '🎊' },
//     { value: 'other', label: 'Other', icon: '📦' },
// ];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
    food: '#f59e0b',
    transport: '#3b82f6',
    rent: '#10b981',
    utilities: '#8b5cf6',
    entertainment: '#ec4899',
    other: '#6b7280',
};

export function getCategoryIcon(category: ExpenseCategory) {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
}

export function getCategoryColor(category: ExpenseCategory) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}
