export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          role: 'owner' | 'stock_manager' | 'cook' | 'server';
          role_title: string | null;
          email: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          role: 'owner' | 'stock_manager' | 'cook' | 'server';
          role_title?: string | null;
          email?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          role?: 'owner' | 'stock_manager' | 'cook' | 'server';
          role_title?: string | null;
          email?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          unit: 'kg' | 'g' | 'L' | 'mL' | 'unit/piece' | 'piece';
          category: 'meat' | 'dairy' | 'beverage' | 'produce' | 'alcohol' | 'other' | 'dry goods' | 'seafood' | 'bakery';
          cost_per_unit: number;
          current_stock: number;
          min_alert_threshold: number | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit: 'kg' | 'g' | 'L' | 'mL' | 'unit/piece' | 'piece';
          category: 'meat' | 'dairy' | 'beverage' | 'produce' | 'alcohol' | 'other' | 'dry goods' | 'seafood' | 'bakery';
          cost_per_unit?: number;
          current_stock?: number;
          min_alert_threshold?: number | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit?: 'kg' | 'g' | 'L' | 'mL' | 'unit/piece' | 'piece';
          category?: 'meat' | 'dairy' | 'beverage' | 'produce' | 'alcohol' | 'other' | 'dry goods' | 'seafood' | 'bakery';
          cost_per_unit?: number;
          current_stock?: number;
          min_alert_threshold?: number | null;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          ingredient_id: string;
          supplier_id: string;
          quantity: number;
          unit_cost: number;
          date: string;
          received_by: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ingredient_id: string;
          supplier_id: string;
          quantity: number;
          unit_cost: number;
          date?: string;
          received_by: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ingredient_id?: string;
          supplier_id?: string;
          quantity?: number;
          unit_cost?: number;
          date?: string;
          received_by?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_counts: {
        Row: {
          id: string;
          ingredient_id: string;
          counted_quantity: number;
          date: string;
          shift: 'morning' | 'evening';
          counted_by: string;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ingredient_id: string;
          counted_quantity: number;
          date?: string;
          shift: 'morning' | 'evening';
          counted_by: string;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ingredient_id?: string;
          counted_quantity?: number;
          date?: string;
          shift?: 'morning' | 'evening';
          counted_by?: string;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          pos_reference: string;
          category: string | null;
          selling_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pos_reference: string;
          category?: string | null;
          selling_price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pos_reference?: string;
          category?: string | null;
          selling_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          menu_item_id: string;
          ingredient_id: string;
          quantity_per_unit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          ingredient_id: string;
          quantity_per_unit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          ingredient_id?: string;
          quantity_per_unit?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          menu_item_id: string;
          quantity_sold: number;
          date: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          quantity_sold: number;
          date?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          quantity_sold?: number;
          date?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      access_logs: {
        Row: {
          id: string;
          staff_id: string;
          staff_name: string | null;
          location: string;
          timestamp_in: string;
          timestamp_out: string | null;
          action: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          staff_name?: string | null;
          location: string;
          timestamp_in?: string;
          timestamp_out?: string | null;
          action?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          staff_name?: string | null;
          location?: string;
          timestamp_in?: string;
          timestamp_out?: string | null;
          action?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pos_voids: {
        Row: {
          id: string;
          menu_item_id: string;
          staff_id: string;
          staff_name: string | null;
          item_name: string | null;
          type: 'void' | 'discount' | 'comp';
          amount: number;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          staff_id: string;
          staff_name?: string | null;
          item_name?: string | null;
          type: 'void' | 'discount' | 'comp';
          amount?: number;
          date?: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          staff_id?: string;
          staff_name?: string | null;
          item_name?: string | null;
          type?: 'void' | 'discount' | 'comp';
          amount?: number;
          date?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      waste_logs: {
        Row: {
          id: string;
          ingredient_id: string;
          quantity: number;
          unit_cost_at_time: number;
          reason: 'spoilage' | 'spillage' | 'breakage' | 'staff_meal' | 'comp' | 'other';
          logged_by: string;
          date: string;
          shift: 'morning' | 'evening';
          notes: string | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          ingredient_id: string;
          quantity: number;
          unit_cost_at_time: number;
          reason: 'spoilage' | 'spillage' | 'breakage' | 'staff_meal' | 'comp' | 'other';
          logged_by: string;
          date: string;
          shift?: 'morning' | 'evening';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit_cost_at_time?: number;
          reason?: 'spoilage' | 'spillage' | 'breakage' | 'staff_meal' | 'comp' | 'other';
          logged_by?: string;
          date?: string;
          shift?: 'morning' | 'evening';
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          supplier_id: string;
          status: 'draft' | 'sent' | 'received';
          created_by: string;
          created_at: string;
          sent_at: string | null;
          received_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          status?: 'draft' | 'sent' | 'received';
          created_by: string;
          created_at?: string;
          sent_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          status?: 'draft' | 'sent' | 'received';
          created_by?: string;
          created_at?: string;
          sent_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          ingredient_id: string;
          suggested_quantity: number;
          unit_cost: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          ingredient_id: string;
          suggested_quantity: number;
          unit_cost: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          purchase_order_id?: string;
          ingredient_id?: string;
          suggested_quantity?: number;
          unit_cost?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_menu_item_cascade: {
        Args: {
          item_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
