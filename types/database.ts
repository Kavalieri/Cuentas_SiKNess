export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          household_id: string
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          household_id: string
          icon?: string | null
          id?: string
          name: string
          type?: string
        }
        Update: {
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_adjustments: {
        Row: {
          amount: number
          contribution_id: string
          created_at: string
          created_by: string
          id: string
          reason: string
        }
        Insert: {
          amount: number
          contribution_id: string
          created_at?: string
          created_by: string
          id?: string
          reason: string
        }
        Update: {
          amount?: number
          contribution_id?: string
          created_at?: string
          created_by?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_adjustments_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          created_at: string
          expected_amount: number
          household_id: string
          id: string
          month: number
          paid_amount: number
          paid_at: string | null
          pre_payment_amount: number
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          expected_amount: number
          household_id: string
          id?: string
          month: number
          paid_amount?: number
          paid_at?: string | null
          pre_payment_amount?: number
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          expected_amount?: number
          household_id?: string
          id?: string
          month?: number
          paid_amount?: number
          paid_at?: string | null
          pre_payment_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          household_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          household_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_settings: {
        Row: {
          calculation_type: string
          currency: string
          household_id: string
          monthly_contribution_goal: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calculation_type?: string
          currency?: string
          household_id: string
          monthly_contribution_goal: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calculation_type?: string
          currency?: string
          household_id?: string
          monthly_contribution_goal?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          current_uses: number
          email: string | null
          expires_at: string
          household_id: string | null
          id: string
          invited_by: string
          max_uses: number | null
          metadata: Json | null
          status: string
          token: string
          type: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          current_uses?: number
          email?: string | null
          expires_at: string
          household_id?: string | null
          id?: string
          invited_by: string
          max_uses?: number | null
          metadata?: Json | null
          status?: string
          token: string
          type?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          current_uses?: number
          email?: string | null
          expires_at?: string
          household_id?: string | null
          id?: string
          invited_by?: string
          max_uses?: number | null
          metadata?: Json | null
          status?: string
          token?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      member_incomes: {
        Row: {
          created_at: string
          effective_from: string
          household_id: string
          id: string
          monthly_income: number
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          household_id: string
          id?: string
          monthly_income: number
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          household_id?: string
          id?: string
          monthly_income?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_incomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          household_id: string
          id: string
          month: number
          notes: string | null
          opening_balance: number
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          household_id: string
          id?: string
          month: number
          notes?: string | null
          opening_balance?: number
          status?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          household_id?: string
          id?: string
          month?: number
          notes?: string | null
          opening_balance?: number
          status?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_periods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          currency: string
          household_id: string
          id: string
          note: string | null
          occurred_at: string
          period_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          currency?: string
          household_id: string
          id?: string
          note?: string | null
          occurred_at: string
          period_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          currency?: string
          household_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          period_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "monthly_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "v_period_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_payments: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          household_id: string
          id: string
          month: number
          movement_id: string | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          household_id: string
          id?: string
          month: number
          movement_id?: string | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          household_id?: string
          id?: string
          month?: number
          movement_id?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_payments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_payments_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string | null
          granted_by: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          active_household_id: string | null
          created_at: string | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_household_id?: string | null
          created_at?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_household_id?: string | null
          created_at?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_active_household_id_fkey"
            columns: ["active_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_period_stats: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          created_at: string | null
          expense_count: number | null
          household_id: string | null
          id: string | null
          income_count: number | null
          month: number | null
          monthly_savings: number | null
          movement_count: number | null
          opening_balance: number | null
          savings_percentage: number | null
          status: string | null
          top_expense_category: string | null
          total_expenses: number | null
          total_income: number | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string | null
          expense_count?: never
          household_id?: string | null
          id?: string | null
          income_count?: never
          month?: number | null
          monthly_savings?: never
          movement_count?: never
          opening_balance?: number | null
          savings_percentage?: never
          status?: string | null
          top_expense_category?: never
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string | null
          expense_count?: never
          household_id?: string | null
          id?: string | null
          income_count?: never
          month?: number | null
          monthly_savings?: never
          movement_count?: never
          opening_balance?: number | null
          savings_percentage?: never
          status?: string | null
          top_expense_category?: never
          total_expenses?: number | null
          total_income?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_periods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string }
        Returns: {
          household_id: string
          household_name: string
          message: string
          success: boolean
        }[]
      }
      admin_add_member_to_household: {
        Args: { p_household_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      admin_remove_member_from_household: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: Json
      }
      calculate_monthly_contributions: {
        Args: { p_household_id: string; p_month: number; p_year: number }
        Returns: {
          expected_amount: number
          user_id: string
        }[]
      }
      calculate_pre_payment_amount: {
        Args: { p_contribution_id: string }
        Returns: number
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      close_monthly_period: {
        Args: { p_notes?: string; p_period_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          household_id: string
          id: string
          month: number
          notes: string | null
          opening_balance: number
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
          year: number
        }
      }
      create_default_categories: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      create_household_with_member: {
        Args: { p_household_name: string; p_user_id: string }
        Returns: Json
      }
      ensure_monthly_period: {
        Args: { p_household_id: string; p_month: number; p_year: number }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          household_id: string
          id: string
          month: number
          notes: string | null
          opening_balance: number
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
          year: number
        }
      }
      get_household_members: {
        Args: { p_household_id: string }
        Returns: {
          email: string
          household_id: string
          id: string
          role: string
          user_id: string
        }[]
      }
      get_member_income: {
        Args: { p_date?: string; p_household_id: string; p_user_id: string }
        Returns: number
      }
      is_system_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_system_admin_check: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      migrate_existing_movements: {
        Args: Record<PropertyKey, never>
        Returns: {
          household_id: string
          movements_assigned: number
          periods_created: number
        }[]
      }
      reopen_monthly_period: {
        Args: { p_period_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          household_id: string
          id: string
          month: number
          notes: string | null
          opening_balance: number
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
          year: number
        }
      }
      restore_to_stock: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_contribution_status: {
        Args: { p_contribution_id: string }
        Returns: undefined
      }
      update_period_totals: {
        Args: { p_period_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          household_id: string
          id: string
          month: number
          notes: string | null
          opening_balance: number
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
          year: number
        }
      }
      wipe_household_data: {
        Args: { p_household_id: string }
        Returns: Json
      }
      wipe_system_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
