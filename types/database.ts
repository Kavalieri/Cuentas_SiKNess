export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      categories: {
        Row: {
          household_id: string;
          icon: string | null;
          id: string;
          name: string;
          type: string;
          parent_id: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          household_id: string;
          icon?: string | null;
          id?: string;
          name: string;
          type?: string;
          parent_id?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          household_id?: string;
          icon?: string | null;
          id?: string;
          name?: string;
          type?: string;
          parent_id?: string | null;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'category_parents';
            referencedColumns: ['id'];
          },
        ];
      };
      category_parents: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          icon: string;
          type: 'income' | 'expense';
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          icon: string;
          type: 'income' | 'expense';
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          icon?: string;
          type?: 'income' | 'expense';
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_parents_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          icon: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          icon?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          icon?: string | null;
          display_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subcategories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      contribution_adjustment_templates: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          created_by: string | null;
          default_amount: number | null;
          description: string | null;
          household_id: string;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean | null;
          last_used_amount: number | null;
          last_used_at: string | null;
          name: string;
          sort_order: number;
          usage_count: number | null;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          default_amount?: number | null;
          description?: string | null;
          household_id: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean | null;
          last_used_amount?: number | null;
          last_used_at?: string | null;
          name: string;
          sort_order?: number;
          usage_count?: number | null;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          default_amount?: number | null;
          description?: string | null;
          household_id?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean | null;
          last_used_amount?: number | null;
          last_used_at?: string | null;
          name?: string;
          sort_order?: number;
          usage_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contribution_adjustment_templates_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustment_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustment_templates_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      contribution_adjustments: {
        Row: {
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          category_id: string | null;
          contribution_id: string;
          created_at: string;
          created_by: string;
          expense_category_id: string | null;
          expense_description: string | null;
          id: string;
          income_description: string | null;
          income_movement_id: string | null;
          locked_at: string | null;
          locked_by: string | null;
          movement_id: string | null;
          original_amount: number | null;
          readjustment_transaction_id: string | null;
          reason: string;
          rejected_at: string | null;
          rejected_by: string | null;
          status: string;
          template_id: string | null;
          type: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          category_id?: string | null;
          contribution_id: string;
          created_at?: string;
          created_by: string;
          expense_category_id?: string | null;
          expense_description?: string | null;
          id?: string;
          income_description?: string | null;
          income_movement_id?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          movement_id?: string | null;
          original_amount?: number | null;
          readjustment_transaction_id?: string | null;
          reason: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          status?: string;
          template_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          category_id?: string | null;
          contribution_id?: string;
          created_at?: string;
          created_by?: string;
          expense_category_id?: string | null;
          expense_description?: string | null;
          id?: string;
          income_description?: string | null;
          income_movement_id?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          movement_id?: string | null;
          original_amount?: number | null;
          readjustment_transaction_id?: string | null;
          reason?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          status?: string;
          template_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contribution_adjustments_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_contribution_id_fkey';
            columns: ['contribution_id'];
            isOneToOne: false;
            referencedRelation: 'contributions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_expense_category_id_fkey';
            columns: ['expense_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_income_movement_id_fkey';
            columns: ['income_movement_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_income_movement_id_fkey';
            columns: ['income_movement_id'];
            isOneToOne: false;
            referencedRelation: 'v_transactions_with_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_locked_by_fkey';
            columns: ['locked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_movement_id_fkey';
            columns: ['movement_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_movement_id_fkey';
            columns: ['movement_id'];
            isOneToOne: false;
            referencedRelation: 'v_transactions_with_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_readjustment_transaction_id_fkey';
            columns: ['readjustment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_readjustment_transaction_id_fkey';
            columns: ['readjustment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_transactions_with_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'contribution_adjustment_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contribution_adjustments_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      contributions: {
        Row: {
          adjustments_total: number | null;
          calculation_method: string | null;
          created_at: string;
          expected_amount: number | null;
          household_id: string;
          id: string;
          month: number;
          paid_amount: number;
          paid_at: string | null;
          profile_id: string;
          status: string;
          updated_at: string;
          year: number;
        };
        Insert: {
          adjustments_total?: number | null;
          calculation_method?: string | null;
          created_at?: string;
          expected_amount?: number | null;
          household_id: string;
          id?: string;
          month: number;
          paid_amount?: number;
          paid_at?: string | null;
          profile_id: string;
          status?: string;
          updated_at?: string;
          year: number;
        };
        Update: {
          adjustments_total?: number | null;
          calculation_method?: string | null;
          created_at?: string;
          expected_amount?: number | null;
          household_id?: string;
          id?: string;
          month?: number;
          paid_amount?: number;
          paid_at?: string | null;
          profile_id?: string;
          status?: string;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'contributions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contributions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          profile_id: string;
          role: string | null;
        };
        Insert: {
          household_id: string;
          profile_id: string;
          role?: string | null;
        };
        Update: {
          household_id?: string;
          profile_id?: string;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_savings: {
        Row: {
          created_at: string;
          currency: string;
          current_balance: number;
          goal_amount: number | null;
          goal_deadline: string | null;
          goal_description: string | null;
          household_id: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          current_balance?: number;
          goal_amount?: number | null;
          goal_deadline?: string | null;
          goal_description?: string | null;
          household_id: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          current_balance?: number;
          goal_amount?: number | null;
          goal_deadline?: string | null;
          goal_description?: string | null;
          household_id?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_savings_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: true;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_settings: {
        Row: {
          calculation_type: string;
          currency: string;
          household_id: string;
          monthly_contribution_goal: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          calculation_type?: string;
          currency?: string;
          household_id: string;
          monthly_contribution_goal: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          calculation_type?: string;
          currency?: string;
          household_id?: string;
          monthly_contribution_goal?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_settings_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: true;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          settings: Json;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          settings?: Json;
          status?: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          settings?: Json;
          status?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string | null;
          current_uses: number;
          email: string | null;
          expires_at: string;
          household_id: string | null;
          id: string;
          invited_by: string;
          max_uses: number | null;
          metadata: Json | null;
          status: string;
          token: string;
          type: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          current_uses?: number;
          email?: string | null;
          expires_at: string;
          household_id?: string | null;
          id?: string;
          invited_by: string;
          max_uses?: number | null;
          metadata?: Json | null;
          status?: string;
          token: string;
          type?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          current_uses?: number;
          email?: string | null;
          expires_at?: string;
          household_id?: string | null;
          id?: string;
          invited_by?: string;
          max_uses?: number | null;
          metadata?: Json | null;
          status?: string;
          token?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      member_credits: {
        Row: {
          amount: number;
          applied_at: string | null;
          applied_to_contribution_id: string | null;
          applied_to_period_id: string | null;
          auto_apply: boolean;
          created_at: string;
          created_by: string | null;
          currency: string;
          expires_at: string | null;
          household_id: string;
          id: string;
          monthly_decision: string | null;
          profile_id: string;
          reserved_at: string | null;
          savings_transaction_id: string | null;
          source_month: number;
          source_period_id: string | null;
          source_year: number;
          status: string;
          transferred_to_savings: boolean;
          transferred_to_savings_at: string | null;
        };
        Insert: {
          amount: number;
          applied_at?: string | null;
          applied_to_contribution_id?: string | null;
          applied_to_period_id?: string | null;
          auto_apply?: boolean;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          expires_at?: string | null;
          household_id: string;
          id?: string;
          monthly_decision?: string | null;
          profile_id: string;
          reserved_at?: string | null;
          savings_transaction_id?: string | null;
          source_month: number;
          source_period_id?: string | null;
          source_year: number;
          status?: string;
          transferred_to_savings?: boolean;
          transferred_to_savings_at?: string | null;
        };
        Update: {
          amount?: number;
          applied_at?: string | null;
          applied_to_contribution_id?: string | null;
          applied_to_period_id?: string | null;
          auto_apply?: boolean;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          expires_at?: string | null;
          household_id?: string;
          id?: string;
          monthly_decision?: string | null;
          profile_id?: string;
          reserved_at?: string | null;
          savings_transaction_id?: string | null;
          source_month?: number;
          source_period_id?: string | null;
          source_year?: number;
          status?: string;
          transferred_to_savings?: boolean;
          transferred_to_savings_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'member_credits_applied_to_contribution_id_fkey';
            columns: ['applied_to_contribution_id'];
            isOneToOne: false;
            referencedRelation: 'contributions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_applied_to_period_id_fkey';
            columns: ['applied_to_period_id'];
            isOneToOne: false;
            referencedRelation: 'monthly_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_applied_to_period_id_fkey';
            columns: ['applied_to_period_id'];
            isOneToOne: false;
            referencedRelation: 'v_period_stats';
            referencedColumns: ['period_id'];
          },
          {
            foreignKeyName: 'member_credits_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_savings_transaction_id_fkey';
            columns: ['savings_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'savings_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_source_period_id_fkey';
            columns: ['source_period_id'];
            isOneToOne: false;
            referencedRelation: 'monthly_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_credits_source_period_id_fkey';
            columns: ['source_period_id'];
            isOneToOne: false;
            referencedRelation: 'v_period_stats';
            referencedColumns: ['period_id'];
          },
        ];
      };
      member_incomes: {
        Row: {
          created_at: string;
          effective_from: string;
          household_id: string;
          id: string;
          monthly_income: number;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          effective_from: string;
          household_id: string;
          id?: string;
          monthly_income: number;
          profile_id: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          household_id?: string;
          id?: string;
          monthly_income?: number;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'member_incomes_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_incomes_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      monthly_periods: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          closing_balance: number | null;
          created_at: string;
          household_id: string;
          id: string;
          month: number;
          notes: string | null;
          opening_balance: number | null;
          phase: string;
          total_expenses: number | null;
          total_income: number | null;
          updated_at: string;
          validated_at: string | null;
          year: number;
        };
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          closing_balance?: number | null;
          created_at?: string;
          household_id: string;
          id?: string;
          month: number;
          notes?: string | null;
          opening_balance?: number | null;
          phase?: string;
          total_expenses?: number | null;
          total_income?: number | null;
          updated_at?: string;
          validated_at?: string | null;
          year: number;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          closing_balance?: number | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          month?: number;
          notes?: string | null;
          opening_balance?: number | null;
          phase?: string;
          total_expenses?: number | null;
          total_income?: number | null;
          updated_at?: string;
          validated_at?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_periods_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'monthly_periods_last_reopened_by_fkey';
            columns: ['last_reopened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      period_access_log: {
        Row: {
          action: string;
          household_id: string;
          id: string;
          metadata: Json | null;
          new_status: string | null;
          old_status: string | null;
          performed_at: string;
          performed_by: string;
          period_id: string;
          reason: string | null;
        };
        Insert: {
          action: string;
          household_id: string;
          id?: string;
          metadata?: Json | null;
          new_status?: string | null;
          old_status?: string | null;
          performed_at?: string;
          performed_by: string;
          period_id: string;
          reason?: string | null;
        };
        Update: {
          action?: string;
          household_id?: string;
          id?: string;
          metadata?: Json | null;
          new_status?: string | null;
          old_status?: string | null;
          performed_at?: string;
          performed_by?: string;
          period_id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'period_access_log_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'period_access_log_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'period_access_log_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'monthly_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'period_access_log_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'v_period_stats';
            referencedColumns: ['period_id'];
          },
        ];
      };
      profiles: {
        Row: {
          auth_user_id: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      savings_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          balance_before: number;
          category: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          destination_transaction_id: string | null;
          household_id: string;
          id: string;
          notes: string | null;
          savings_id: string;
          source_credit_id: string | null;
          source_profile_id: string | null;
          type: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          balance_before: number;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          destination_transaction_id?: string | null;
          household_id: string;
          id?: string;
          notes?: string | null;
          savings_id: string;
          source_credit_id?: string | null;
          source_profile_id?: string | null;
          type: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          balance_before?: number;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          destination_transaction_id?: string | null;
          household_id?: string;
          id?: string;
          notes?: string | null;
          savings_id?: string;
          source_credit_id?: string | null;
          source_profile_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'savings_transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_destination_transaction_id_fkey';
            columns: ['destination_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_destination_transaction_id_fkey';
            columns: ['destination_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_transactions_with_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_savings_id_fkey';
            columns: ['savings_id'];
            isOneToOne: false;
            referencedRelation: 'household_savings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_source_credit_id_fkey';
            columns: ['source_credit_id'];
            isOneToOne: false;
            referencedRelation: 'member_credits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'savings_transactions_source_profile_id_fkey';
            columns: ['source_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      system_admins: {
        Row: {
          created_at: string | null;
          granted_by: string | null;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          granted_by?: string | null;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          granted_by?: string | null;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      transaction_history: {
        Row: {
          change_reason: string | null;
          changed_at: string | null;
          changed_by: string;
          created_at: string | null;
          household_id: string;
          id: string;
          new_amount: number | null;
          new_category_id: string | null;
          new_description: string | null;
          new_occurred_at: string | null;
          old_amount: number | null;
          old_category_id: string | null;
          old_description: string | null;
          old_occurred_at: string | null;
          transaction_id: string;
        };
        Insert: {
          change_reason?: string | null;
          changed_at?: string | null;
          changed_by: string;
          created_at?: string | null;
          household_id: string;
          id?: string;
          new_amount?: number | null;
          new_category_id?: string | null;
          new_description?: string | null;
          new_occurred_at?: string | null;
          old_amount?: number | null;
          old_category_id?: string | null;
          old_description?: string | null;
          old_occurred_at?: string | null;
          transaction_id: string;
        };
        Update: {
          change_reason?: string | null;
          changed_at?: string | null;
          changed_by?: string;
          created_at?: string | null;
          household_id?: string;
          id?: string;
          new_amount?: number | null;
          new_category_id?: string | null;
          new_description?: string | null;
          new_occurred_at?: string | null;
          old_amount?: number | null;
          old_category_id?: string | null;
          old_description?: string | null;
          old_occurred_at?: string | null;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transaction_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_history_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_history_new_category_id_fkey';
            columns: ['new_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_history_old_category_id_fkey';
            columns: ['old_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_history_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_history_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_transactions_with_profile';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_email: string | null;
          created_by_member_id: string | null;
          currency: string;
          description: string | null;
          flow_type: string;
          household_id: string;
          id: string;
          locked_at: string | null;
          locked_by: string | null;
          occurred_at: string;
          paid_by: string | null;
          performed_at: string | null;
          performed_by_email: string | null;
          period_id: string | null;
          profile_id: string | null;
          real_payer_id: string | null;
          source_id: string | null;
          source_type: string | null;
          split_data: Json | null;
          split_type: string;
          status: string;
          subcategory_id: string | null;
          transaction_pair_id: string | null;
          type: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          created_by_email?: string | null;
          created_by_member_id?: string | null;
          currency?: string;
          description?: string | null;
          flow_type?: string;
          household_id: string;
          id?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          occurred_at: string;
          paid_by?: string | null;
          performed_at?: string | null;
          performed_by_email?: string | null;
          period_id?: string | null;
          profile_id?: string | null;
          real_payer_id?: string | null;
          source_id?: string | null;
          source_type?: string | null;
          split_data?: Json | null;
          split_type?: string;
          status?: string;
          subcategory_id?: string | null;
          transaction_pair_id?: string | null;
          type: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          created_by_email?: string | null;
          created_by_member_id?: string | null;
          currency?: string;
          description?: string | null;
          flow_type?: string;
          household_id?: string;
          id?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          occurred_at?: string;
          paid_by?: string | null;
          performed_at?: string | null;
          performed_by_email?: string | null;
          period_id?: string | null;
          profile_id?: string | null;
          real_payer_id?: string | null;
          source_id?: string | null;
          source_type?: string | null;
          split_data?: Json | null;
          split_type?: string;
          status?: string;
          transaction_pair_id?: string | null;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movements_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'monthly_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'v_period_stats';
            referencedColumns: ['period_id'];
          },
          {
            foreignKeyName: 'transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_locked_by_fkey';
            columns: ['locked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_paid_by_fkey';
            columns: ['paid_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_subcategory_id_fkey';
            columns: ['subcategory_id'];
            isOneToOne: false;
            referencedRelation: 'subcategories';
            referencedColumns: ['id'];
          },
        ];
      };
      user_settings: {
        Row: {
          active_household_id: string | null;
          created_at: string | null;
          preferences: Json | null;
          profile_id: string;
          updated_at: string | null;
        };
        Insert: {
          active_household_id?: string | null;
          created_at?: string | null;
          preferences?: Json | null;
          profile_id: string;
          updated_at?: string | null;
        };
        Update: {
          active_household_id?: string | null;
          created_at?: string | null;
          preferences?: Json | null;
          profile_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_settings_active_household_id_fkey';
            columns: ['active_household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_settings_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      v_period_stats: {
        Row: {
          balance: number | null;
          household_id: string | null;
          month: number | null;
          period_id: string | null;
          status: string | null;
          total_expenses: number | null;
          total_income: number | null;
          transaction_count: number | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_periods_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      v_transactions_with_profile: {
        Row: {
          amount: number | null;
          category_id: string | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          description: string | null;
          household_id: string | null;
          id: string | null;
          locked_at: string | null;
          locked_by: string | null;
          occurred_at: string | null;
          paid_by: string | null;
          period_id: string | null;
          profile_avatar: string | null;
          profile_email: string | null;
          profile_id: string | null;
          profile_name: string | null;
          source_id: string | null;
          source_type: string | null;
          split_data: Json | null;
          split_type: string | null;
          status: string | null;
          type: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movements_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'monthly_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movements_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'v_period_stats';
            referencedColumns: ['period_id'];
          },
          {
            foreignKeyName: 'transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_locked_by_fkey';
            columns: ['locked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_paid_by_fkey';
            columns: ['paid_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      accept_invitation: {
        Args: { p_token: string };
        Returns: {
          household_id: string;
          household_name: string;
          message: string;
          success: boolean;
        }[];
      };
      admin_add_member_to_household: {
        Args: { p_household_id: string; p_role?: string; p_user_id: string };
        Returns: Json;
      };
      admin_remove_member_from_household: {
        Args: { p_household_id: string; p_user_id: string };
        Returns: Json;
      };
      apply_credit_to_contribution: {
        Args: {
          p_applied_by: string;
          p_contribution_id: string;
          p_credit_id: string;
        };
        Returns: Json;
      };
      apply_member_credits: {
        Args: { p_household_id: string; p_month: number; p_year: number };
        Returns: undefined;
      };
      auto_apply_active_credits: {
        Args: { p_household_id: string; p_period_id: string };
        Returns: Json;
      };
      calculate_monthly_contributions: {
        Args: { p_household_id: string; p_month: number; p_year: number };
        Returns: {
          calculation_method: string;
          expected_amount: number;
          income_percentage: number;
          profile_id: string;
        }[];
      };
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      close_monthly_period: {
        Args: {
          p_household_id: string;
          p_period_id: string;
          p_closed_by: string;
          p_reason?: string | null;
        };
        Returns: string;
      };
      create_default_categories: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      create_household_with_member: {
        Args: { p_household_name: string; p_profile_id: string };
        Returns: Json;
      };
      create_member_credit_from_overpayment: {
        Args: { p_contribution_id: string; p_created_by?: string };
        Returns: string;
      };
      deposit_to_savings: {
        Args: {
          p_amount: number;
          p_category?: string;
          p_created_by?: string;
          p_description: string;
          p_household_id: string;
          p_notes?: string;
          p_source_profile_id: string;
        };
        Returns: Json;
      };
      ensure_monthly_period: {
        Args: { p_household_id: string; p_month: number; p_year: number };
        Returns: string;
      };
      lock_contributions_period: {
        Args: { p_household_id: string; p_period_id: string; p_locked_by: string };
        Returns: string;
      };
      open_monthly_period: {
        Args: { p_household_id: string; p_period_id: string; p_opened_by: string };
        Returns: string;
      };
      expire_old_credits: {
        Args: { p_months_to_expire?: number };
        Returns: number;
      };
      get_active_credits_sum: {
        Args: { p_household_id: string };
        Returns: number;
      };
      get_balance_breakdown: {
        Args: { p_household_id: string };
        Returns: {
          active_credits: number;
          free_balance: number;
          reserved_credits: number;
          total_balance: number;
        }[];
      };
      get_current_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_url: string;
          bio: string;
          display_name: string;
          email: string;
          id: string;
        }[];
      };
      get_current_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_household_members: {
        Args: { p_household_id: string };
        Returns: {
          email: string;
          household_id: string;
          id: string;
          profile_id: string;
          role: string;
        }[];
      };
      get_member_credits_summary: {
        Args: { p_household_id: string; p_profile_id: string };
        Returns: Json;
      };
      get_member_income: {
        Args: { p_date?: string; p_household_id: string; p_profile_id: string };
        Returns: number;
      };
      get_profile_id_from_auth: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_reserved_credits_sum: {
        Args: { p_household_id: string };
        Returns: number;
      };
      get_user_household_ids: {
        Args: Record<PropertyKey, never>;
        Returns: {
          household_id: string;
        }[];
      };
      is_contribution_owner: {
        Args: { p_contribution_id: string };
        Returns: boolean;
      };
      is_system_admin: {
        Args: { check_user_id?: string };
        Returns: boolean;
      };
      is_system_admin_check: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      migrate_existing_movements: {
        Args: Record<PropertyKey, never>;
        Returns: {
          household_id: string;
          periods_created: number;
          transactions_migrated: number;
        }[];
      };
      recalculate_contribution_paid_amount: {
        Args: { p_contribution_id: string };
        Returns: undefined;
      };
      reopen_monthly_period: {
        // Nota: La función en DB tiene dos overloads:
        // 1) reopen_monthly_period(p_household_id uuid, p_period_id uuid, p_reopened_by uuid, p_reason text)
        // 2) reopen_monthly_period(p_period_id uuid, p_reopened_by uuid, p_reason text)
        // Ambos retornan uuid (id del período). Mantenemos la firma compacta (sin household_id)
        // para compatibilidad con llamadas RPC tipadas, pero reflejamos el tipo de retorno correcto.
        Args: { p_period_id: string; p_reason?: string | null; p_reopened_by: string };
        Returns: string;
      };
      reserve_credit_for_next_month: {
        Args: { p_credit_id: string; p_reserved_by: string };
        Returns: Json;
      };
      restore_to_stock: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      selective_wipe_household: {
        Args: { p_household_id: string; p_options?: Json };
        Returns: Json;
      };
      selective_wipe_system: {
        Args: { p_options?: Json };
        Returns: Json;
      };
      transfer_credit_to_savings: {
        Args: {
          p_credit_id: string;
          p_notes?: string;
          p_transferred_by: string;
        };
        Returns: Json;
      };
      unreserve_credit: {
        Args: { p_credit_id: string; p_unreserved_by: string };
        Returns: Json;
      };
      update_contribution_status: {
        Args: { p_contribution_id: string };
        Returns: undefined;
      };
      update_period_totals: {
        Args: { p_period_id: string };
        Returns: {
          auto_close_enabled: boolean;
          closed_at: string | null;
          closed_by: string | null;
          closing_balance: number;
          created_at: string;
          household_id: string;
          id: string;
          last_reopened_at: string | null;
          last_reopened_by: string | null;
          month: number;
          notes: string | null;
          opening_balance: number;
          reopened_count: number;
          status: string;
          total_expenses: number;
          total_income: number;
          updated_at: string;
          year: number;
        };
      };
      wipe_household_data: {
        Args: { p_household_id: string };
        Returns: Json;
      };
      wipe_system_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      withdraw_from_savings: {
        Args: {
          p_amount: number;
          p_category_id?: string;
          p_create_common_transaction?: boolean;
          p_household_id: string;
          p_notes?: string;
          p_reason: string;
          p_withdrawn_by: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
