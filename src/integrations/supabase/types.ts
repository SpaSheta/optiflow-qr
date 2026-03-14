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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bill_items: {
        Row: {
          bill_id: string | null
          created_at: string | null
          id: string
          menu_item_id: string | null
          name: string
          notes: string | null
          quantity: number
          restaurant_id: string | null
          total_price: number
          unit_price: number
          voided: boolean | null
        }
        Insert: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name: string
          notes?: string | null
          quantity?: number
          restaurant_id?: string | null
          total_price: number
          unit_price: number
          voided?: boolean | null
        }
        Update: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          restaurant_id?: string | null
          total_price?: number
          unit_price?: number
          voided?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          closed_at: string | null
          id: string
          opened_at: string | null
          restaurant_id: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          id?: string
          opened_at?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          restaurant_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          name: string
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          restaurant_id: string | null
          sort_order: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_themes: {
        Row: {
          background_color: string | null
          font_family: string | null
          id: string
          intro_video_url: string | null
          logo_url: string | null
          menu_layout: string | null
          primary_color: string | null
          restaurant_id: string | null
          secondary_color: string | null
        }
        Insert: {
          background_color?: string | null
          font_family?: string | null
          id?: string
          intro_video_url?: string | null
          logo_url?: string | null
          menu_layout?: string | null
          primary_color?: string | null
          restaurant_id?: string | null
          secondary_color?: string | null
        }
        Update: {
          background_color?: string | null
          font_family?: string | null
          id?: string
          intro_video_url?: string | null
          logo_url?: string | null
          menu_layout?: string | null
          primary_color?: string | null
          restaurant_id?: string | null
          secondary_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_themes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by_super_admin: boolean | null
          currency: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          plan: string | null
          slug: string
          status: string | null
          tax_rate: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by_super_admin?: boolean | null
          currency?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan?: string | null
          slug: string
          status?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by_super_admin?: boolean | null
          currency?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan?: string | null
          slug?: string
          status?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      table_qr_tokens: {
        Row: {
          created_at: string | null
          id: string
          qr_url: string | null
          regenerated_at: string | null
          restaurant_id: string | null
          table_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          qr_url?: string | null
          regenerated_at?: string | null
          restaurant_id?: string | null
          table_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          qr_url?: string | null
          regenerated_at?: string | null
          restaurant_id?: string | null
          table_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_qr_tokens_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_qr_tokens_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          restaurant_id: string | null
          table_number: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          restaurant_id?: string | null
          table_number: string
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          restaurant_id?: string | null
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_requests: {
        Row: {
          bill_id: string | null
          created_at: string | null
          id: string
          message: string | null
          restaurant_id: string | null
          status: string | null
          table_id: string | null
          type: string
        }
        Insert: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          restaurant_id?: string | null
          status?: string | null
          table_id?: string | null
          type: string
        }
        Update: {
          bill_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          restaurant_id?: string | null
          status?: string | null
          table_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_requests_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_requests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_restaurant_ids: { Args: { _user_id: string }; Returns: string[] }
      is_super_admin: { Args: never; Returns: boolean }
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
