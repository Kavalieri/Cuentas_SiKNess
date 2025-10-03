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
          currency: string
          household_id: string
          monthly_contribution_goal: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency?: string
          household_id: string
          monthly_contribution_goal: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          income_percentage: number
          user_id: string
        }[]
      }
      create_default_categories: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      create_household_with_member: {
        Args: { p_household_name: string; p_user_id: string }
        Returns: Json
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
      restore_to_stock: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_contribution_status: {
        Args: { p_contribution_id: string }
        Returns: undefined
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
