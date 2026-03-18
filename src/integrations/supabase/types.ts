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
      dealer_transactions: {
        Row: {
          amount: number
          created_at: string
          dealer_id: string
          description: string
          id: string
          imei_ref: string | null
          invoice_ref: string | null
          running_balance: number
          shop_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          dealer_id: string
          description?: string
          id?: string
          imei_ref?: string | null
          invoice_ref?: string | null
          running_balance?: number
          shop_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          dealer_id?: string
          description?: string
          id?: string
          imei_ref?: string | null
          invoice_ref?: string | null
          running_balance?: number
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_transactions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          address: string
          brand_name: string
          created_at: string
          dealer_name: string
          gstin: string
          id: string
          phone: string
          shop_id: string
          total_credit: number
          updated_at: string
        }
        Insert: {
          address?: string
          brand_name?: string
          created_at?: string
          dealer_name: string
          gstin?: string
          id?: string
          phone?: string
          shop_id: string
          total_credit?: number
          updated_at?: string
        }
        Update: {
          address?: string
          brand_name?: string
          created_at?: string
          dealer_name?: string
          gstin?: string
          id?: string
          phone?: string
          shop_id?: string
          total_credit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      imei_records: {
        Row: {
          created_at: string
          dealer_id: string | null
          id: string
          imei: string
          invoice_id: string | null
          product_id: string
          purchase_date: string
          purchase_price: number
          shop_id: string
          sold_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          dealer_id?: string | null
          id?: string
          imei: string
          invoice_id?: string | null
          product_id: string
          purchase_date?: string
          purchase_price?: number
          shop_id: string
          sold_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          dealer_id?: string | null
          id?: string
          imei?: string
          invoice_id?: string | null
          product_id?: string
          purchase_date?: string
          purchase_price?: number
          shop_id?: string
          sold_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imei_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imei_records_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          discount: number
          discount_type: string
          discount_value: number
          id: string
          imei: string | null
          invoice_id: string
          product_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          imei?: string | null
          invoice_id: string
          product_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          imei?: string | null
          invoice_id?: string
          product_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bill_discount: number
          bill_discount_type: string
          billing_address: string | null
          billing_business_name: string | null
          billing_gst_number: string | null
          billing_phone: string | null
          cgst: number
          created_at: string
          customer_gst: string | null
          customer_name: string
          customer_phone: string
          date: string
          grand_total: number
          gst_bearer: string
          gst_profile_id: string | null
          id: string
          invoice_number: string
          is_gst_bill: boolean
          payment_details: Json | null
          payment_method: string
          print_type: string
          sgst: number
          shop_id: string
          status: string
          subtotal: number
          total_discount: number
          user_id: string
        }
        Insert: {
          bill_discount?: number
          bill_discount_type?: string
          billing_address?: string | null
          billing_business_name?: string | null
          billing_gst_number?: string | null
          billing_phone?: string | null
          cgst?: number
          created_at?: string
          customer_gst?: string | null
          customer_name?: string
          customer_phone?: string
          date?: string
          grand_total?: number
          gst_bearer?: string
          gst_profile_id?: string | null
          id?: string
          invoice_number: string
          is_gst_bill?: boolean
          payment_details?: Json | null
          payment_method?: string
          print_type?: string
          sgst?: number
          shop_id: string
          status?: string
          subtotal?: number
          total_discount?: number
          user_id: string
        }
        Update: {
          bill_discount?: number
          bill_discount_type?: string
          billing_address?: string | null
          billing_business_name?: string | null
          billing_gst_number?: string | null
          billing_phone?: string | null
          cgst?: number
          created_at?: string
          customer_gst?: string | null
          customer_name?: string
          customer_phone?: string
          date?: string
          grand_total?: number
          gst_bearer?: string
          gst_profile_id?: string | null
          id?: string
          invoice_number?: string
          is_gst_bill?: boolean
          payment_details?: Json | null
          payment_method?: string
          print_type?: string
          sgst?: number
          shop_id?: string
          status?: string
          subtotal?: number
          total_discount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_gst_profile_id_fkey"
            columns: ["gst_profile_id"]
            isOneToOne: false
            referencedRelation: "shop_gst_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category: string
          color: string
          created_at: string
          gst_percent: number
          id: string
          low_stock_threshold: number
          model: string
          purchase_price: number
          sale_price: number
          shop_id: string
          stock_quantity: number
          updated_at: string
          variant: string
        }
        Insert: {
          brand: string
          category?: string
          color?: string
          created_at?: string
          gst_percent?: number
          id?: string
          low_stock_threshold?: number
          model: string
          purchase_price?: number
          sale_price?: number
          shop_id: string
          stock_quantity?: number
          updated_at?: string
          variant?: string
        }
        Update: {
          brand?: string
          category?: string
          color?: string
          created_at?: string
          gst_percent?: number
          id?: string
          low_stock_threshold?: number
          model?: string
          purchase_price?: number
          sale_price?: number
          shop_id?: string
          stock_quantity?: number
          updated_at?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_gst_profiles: {
        Row: {
          address: string
          business_name: string
          created_at: string
          gst_number: string
          id: string
          invoice_prefix: string
          is_default: boolean
          last_invoice_number: number
          phone: string
          profile_name: string
          profile_type: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string
          business_name?: string
          created_at?: string
          gst_number?: string
          id?: string
          invoice_prefix?: string
          is_default?: boolean
          last_invoice_number?: number
          phone?: string
          profile_name?: string
          profile_type?: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          business_name?: string
          created_at?: string
          gst_number?: string
          id?: string
          invoice_prefix?: string
          is_default?: boolean
          last_invoice_number?: number
          phone?: string
          profile_name?: string
          profile_type?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_gst_profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          created_at: string
          default_gst_percent: number
          default_print_type: string
          discount_enabled: boolean
          id: string
          pin_code: string
          shop_id: string
          thermal_width: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_gst_percent?: number
          default_print_type?: string
          discount_enabled?: boolean
          id?: string
          pin_code?: string
          shop_id: string
          thermal_width?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_gst_percent?: number
          default_print_type?: string
          discount_enabled?: boolean
          id?: string
          pin_code?: string
          shop_id?: string
          thermal_width?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          created_at: string
          created_by: string | null
          gst_number: string
          id: string
          invoice_prefix: string
          last_invoice_number: number
          logo_url: string | null
          name: string
          phone: string
          terms_and_conditions: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          created_by?: string | null
          gst_number?: string
          id?: string
          invoice_prefix?: string
          last_invoice_number?: number
          logo_url?: string | null
          name: string
          phone?: string
          terms_and_conditions?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string | null
          gst_number?: string
          id?: string
          invoice_prefix?: string
          last_invoice_number?: number
          logo_url?: string | null
          name?: string
          phone?: string
          terms_and_conditions?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: { Args: { p_product_id: string }; Returns: undefined }
      get_user_shop_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_shop_admin: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      is_shop_member: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
