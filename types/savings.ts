export type SavingsBalance = {
  household_id: string;
  current_balance: number;
  goal_amount: number | null;
  goal_description: string | null;
  goal_deadline: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SavingsTransaction = {
  id: string;
  household_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_from_credit' | 'interest' | 'adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  category: string | null;
  source_profile_id: string | null;
  source_credit_id: string | null;
  destination_transaction_id: string | null;
  created_at: string;
  updated_at?: string;
  // Relaciones
  source_profile?: {
    display_name: string;
    email: string;
    avatar_url: string | null;
  };
  source_credit?: {
    amount: number;
    description: string | null;
    origin_date: string;
  };
  household_savings?: {
    current_balance: number;
    goal_amount: number | null;
    goal_description: string | null;
  };
};
