// Type definitions for Splitwise Clone

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    created_at: string;
}

export interface Group {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    created_at: string;
}

export interface GroupMember {
    group_id: string;
    profile_id: string;
    joined_at: string;
}

export interface Expense {
    id: string;
    group_id: string;
    payer_id: string;
    description: string;
    amount: number;
    currency: string;
    category: ExpenseCategory;
    created_at: string;
    attachment_url: string | null;
}

export interface ExpenseSplit {
    expense_id: string;
    user_id: string;
    amount: number;
    status: 'unpaid' | 'paid';
}

export type ExpenseCategory =
    | 'food'
    | 'transport'
    | 'rent'
    | 'utilities'
    | 'entertainment'
    | 'other';

export type SplitType = 'equal' | 'percentage' | 'exact';

export interface CreateExpenseInput {
    group_id: string;
    payer_id: string;
    description: string;
    amount: number;
    currency?: string;
    category: ExpenseCategory;
    split_type: SplitType;
    splits: { user_id: string; amount?: number; percentage?: number }[];
    attachment?: File;
}

export interface CreateGroupInput {
    name: string;
    description?: string;
}

export interface Balance {
    user_id: string;
    amount: number; // positive means owed to user, negative means user owes
}

export interface GroupBalance {
    group_id: string;
    balances: Balance[];
}
