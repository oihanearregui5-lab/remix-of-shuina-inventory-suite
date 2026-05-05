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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          changed_fields: string[] | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          new_data: Json | null
          old_data: Json | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          summary?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by_user_id: string
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          id: string
          machine_id: string | null
          staff_member_id: string | null
          start_at: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by_user_id: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          machine_id?: string | null
          staff_member_id?: string | null
          start_at: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          id?: string
          machine_id?: string | null
          staff_member_id?: string | null
          start_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          created_at: string
          created_by_user_id: string
          id: string
          membership_role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          membership_role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          membership_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          direct_message_key: string | null
          id: string
          kind: string
          name: string
          slug: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          direct_message_key?: string | null
          id?: string
          kind?: string
          name: string
          slug: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          direct_message_key?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      chat_message_attachments: {
        Row: {
          channel_id: string
          created_at: string
          file_size: number | null
          id: string
          message_id: string
          mime_type: string | null
          storage_path: string
          uploaded_by_user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          file_size?: number | null
          id?: string
          message_id: string
          mime_type?: string | null
          storage_path: string
          uploaded_by_user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          file_size?: number | null
          id?: string
          message_id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_user_id: string
          channel_id: string
          created_at: string
          id: string
          message: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          channel_id: string
          created_at?: string
          id?: string
          message: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          channel_id?: string
          created_at?: string
          id?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_read_state: {
        Row: {
          channel_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_state_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      company_calendar_days: {
        Row: {
          calendar_date: string
          color_tag: string | null
          created_at: string
          created_by_user_id: string | null
          day_type: string
          id: string
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calendar_date: string
          color_tag?: string | null
          created_at?: string
          created_by_user_id?: string | null
          day_type?: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calendar_date?: string
          color_tag?: string | null
          created_at?: string
          created_by_user_id?: string | null
          day_type?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consumable_movements: {
        Row: {
          consumable_id: string
          created_at: string
          created_by_user_id: string
          id: string
          machine_id: string | null
          movement_date: string
          movement_type: string
          quantity: number
          reason: string | null
        }
        Insert: {
          consumable_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          machine_id?: string | null
          movement_date?: string
          movement_type: string
          quantity: number
          reason?: string | null
        }
        Update: {
          consumable_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          machine_id?: string | null
          movement_date?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: []
      }
      consumables: {
        Row: {
          category: string
          created_at: string
          created_by_user_id: string | null
          current_stock: number
          id: string
          is_active: boolean
          min_stock: number
          name: string
          notes: string | null
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          notes?: string | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          notes?: string | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_highlights: {
        Row: {
          category: string
          created_at: string
          created_by_user_id: string
          highlight_date: string
          id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by_user_id: string
          highlight_date?: string
          id?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by_user_id?: string
          highlight_date?: string
          id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_notes: {
        Row: {
          amount: number | null
          company: string
          created_at: string
          created_by_user_id: string | null
          delivery_date: string
          expense_target: string
          id: string
          machine_asset_id: string | null
          notes: string | null
          order_number: string
          photo_path: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          company: string
          created_at?: string
          created_by_user_id?: string | null
          delivery_date?: string
          expense_target: string
          id?: string
          machine_asset_id?: string | null
          notes?: string | null
          order_number: string
          photo_path?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          company?: string
          created_at?: string
          created_by_user_id?: string | null
          delivery_date?: string
          expense_target?: string
          id?: string
          machine_asset_id?: string | null
          notes?: string | null
          order_number?: string
          photo_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_machine_asset_id_fkey"
            columns: ["machine_asset_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_cards: {
        Row: {
          alias: string
          assigned_vehicle: string | null
          created_at: string
          id: string
          is_active: boolean
          masked_number: string | null
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          alias: string
          assigned_vehicle?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          masked_number?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alias?: string
          assigned_vehicle?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          masked_number?: string | null
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      fuel_recharges: {
        Row: {
          amount_eur: number
          created_at: string
          created_by_user_id: string
          id: string
          notes: string | null
          recharge_date: string
        }
        Insert: {
          amount_eur: number
          created_at?: string
          created_by_user_id: string
          id?: string
          notes?: string | null
          recharge_date?: string
        }
        Update: {
          amount_eur?: number
          created_at?: string
          created_by_user_id?: string
          id?: string
          notes?: string | null
          recharge_date?: string
        }
        Relationships: []
      }
      fuel_records: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          created_by_user_id: string
          extra_info: string | null
          id: string
          kilometers: number | null
          liters: number | null
          observations: string | null
          receipt_photo_name: string | null
          receipt_photo_path: string | null
          record_date: string
          station: string
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          amount?: number
          card_id: string
          created_at?: string
          created_by_user_id: string
          extra_info?: string | null
          id?: string
          kilometers?: number | null
          liters?: number | null
          observations?: string | null
          receipt_photo_name?: string | null
          receipt_photo_path?: string | null
          record_date?: string
          station: string
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          created_by_user_id?: string
          extra_info?: string | null
          id?: string
          kilometers?: number | null
          liters?: number | null
          observations?: string | null
          receipt_photo_name?: string | null
          receipt_photo_path?: string | null
          record_date?: string
          station?: string
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_records_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "fuel_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_settings: {
        Row: {
          id: number
          threshold_warning: number
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          id?: number
          threshold_warning?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          id?: number
          threshold_warning?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          color_hex: string
          created_at: string
          date: string
          id: string
          label: string
          type: Database["public"]["Enums"]["holiday_type"]
          updated_at: string
        }
        Insert: {
          color_hex: string
          created_at?: string
          date: string
          id?: string
          label: string
          type: Database["public"]["Enums"]["holiday_type"]
          updated_at?: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          date?: string
          id?: string
          label?: string
          type?: Database["public"]["Enums"]["holiday_type"]
          updated_at?: string
        }
        Relationships: []
      }
      machine_assets: {
        Row: {
          air_filter_last_date: string | null
          asset_code: string | null
          asset_family: string
          coolant_last_date: string | null
          created_at: string
          display_name: string
          fuel_filter_last_date: string | null
          hydraulic_oil_last_date: string | null
          id: string
          insurance_expiry_date: string | null
          itv_last_date: string | null
          itv_next_date: string | null
          license_plate: string | null
          next_inspection_date: string | null
          next_itv_date: string | null
          notes: string | null
          oil_last_date: string | null
          oil_last_hours: number | null
          oil_next_hours: number | null
          photo_url: string | null
          provider_contact: string | null
          provider_name: string | null
          provider_notes: string | null
          status: Database["public"]["Enums"]["machine_status"]
          technical_notes: string | null
          tires_last_check_date: string | null
          updated_at: string
          watch_points: string[]
        }
        Insert: {
          air_filter_last_date?: string | null
          asset_code?: string | null
          asset_family: string
          coolant_last_date?: string | null
          created_at?: string
          display_name: string
          fuel_filter_last_date?: string | null
          hydraulic_oil_last_date?: string | null
          id?: string
          insurance_expiry_date?: string | null
          itv_last_date?: string | null
          itv_next_date?: string | null
          license_plate?: string | null
          next_inspection_date?: string | null
          next_itv_date?: string | null
          notes?: string | null
          oil_last_date?: string | null
          oil_last_hours?: number | null
          oil_next_hours?: number | null
          photo_url?: string | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_notes?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          technical_notes?: string | null
          tires_last_check_date?: string | null
          updated_at?: string
          watch_points?: string[]
        }
        Update: {
          air_filter_last_date?: string | null
          asset_code?: string | null
          asset_family?: string
          coolant_last_date?: string | null
          created_at?: string
          display_name?: string
          fuel_filter_last_date?: string | null
          hydraulic_oil_last_date?: string | null
          id?: string
          insurance_expiry_date?: string | null
          itv_last_date?: string | null
          itv_next_date?: string | null
          license_plate?: string | null
          next_inspection_date?: string | null
          next_itv_date?: string | null
          notes?: string | null
          oil_last_date?: string | null
          oil_last_hours?: number | null
          oil_next_hours?: number | null
          photo_url?: string | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_notes?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          technical_notes?: string | null
          tires_last_check_date?: string | null
          updated_at?: string
          watch_points?: string[]
        }
        Relationships: []
      }
      machine_attachments: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          machine_id: string
          storage_path: string
          uploaded_by_user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          machine_id: string
          storage_path: string
          uploaded_by_user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          machine_id?: string
          storage_path?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
      }
      machine_incidents: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          horizon: Database["public"]["Enums"]["machine_issue_horizon"]
          id: string
          machine_id: string
          reported_by_user_id: string
          status: Database["public"]["Enums"]["machine_issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          horizon?: Database["public"]["Enums"]["machine_issue_horizon"]
          id?: string
          machine_id: string
          reported_by_user_id: string
          status?: Database["public"]["Enums"]["machine_issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          horizon?: Database["public"]["Enums"]["machine_issue_horizon"]
          id?: string
          machine_id?: string
          reported_by_user_id?: string
          status?: Database["public"]["Enums"]["machine_issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_incidents_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_incidents_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_incidents_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_maintenance_log: {
        Row: {
          adblue_done: boolean
          adblue_liters: number | null
          coolant_done: boolean
          coolant_liters: number | null
          created_at: string
          created_by_user_id: string | null
          engine_oil_done: boolean
          engine_oil_liters: number | null
          hydraulic_oil_done: boolean
          hydraulic_oil_liters: number | null
          id: string
          log_date: string
          machine_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          adblue_done?: boolean
          adblue_liters?: number | null
          coolant_done?: boolean
          coolant_liters?: number | null
          created_at?: string
          created_by_user_id?: string | null
          engine_oil_done?: boolean
          engine_oil_liters?: number | null
          hydraulic_oil_done?: boolean
          hydraulic_oil_liters?: number | null
          id?: string
          log_date?: string
          machine_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          adblue_done?: boolean
          adblue_liters?: number | null
          coolant_done?: boolean
          coolant_liters?: number | null
          created_at?: string
          created_by_user_id?: string | null
          engine_oil_done?: boolean
          engine_oil_liters?: number | null
          hydraulic_oil_done?: boolean
          hydraulic_oil_liters?: number | null
          id?: string
          log_date?: string
          machine_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      machine_notes: {
        Row: {
          author_user_id: string
          created_at: string
          id: string
          is_highlight: boolean
          machine_id: string
          note: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          id?: string
          is_highlight?: boolean
          machine_id: string
          note: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          id?: string
          is_highlight?: boolean
          machine_id?: string
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      machine_service_records: {
        Row: {
          assigned_staff_id: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          due_date: string | null
          id: string
          machine_id: string
          meter_hours: number | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          service_type: Database["public"]["Enums"]["machine_service_type"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          due_date?: string | null
          id?: string
          machine_id: string
          meter_hours?: number | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          service_type: Database["public"]["Enums"]["machine_service_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          due_date?: string | null
          id?: string
          machine_id?: string
          meter_hours?: number | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          service_type?: Database["public"]["Enums"]["machine_service_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_service_records_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_service_records_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_service_records_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_completed: boolean
          is_pinned: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_allowances: {
        Row: {
          annual_hours_target: number
          created_at: string
          id: string
          notes: string | null
          personal_adjustment_days: number
          personal_days_base: number
          staff_member_id: string
          updated_at: string
          vacation_adjustment_days: number
          vacation_days_base: number
        }
        Insert: {
          annual_hours_target?: number
          created_at?: string
          id?: string
          notes?: string | null
          personal_adjustment_days?: number
          personal_days_base?: number
          staff_member_id: string
          updated_at?: string
          vacation_adjustment_days?: number
          vacation_days_base?: number
        }
        Update: {
          annual_hours_target?: number
          created_at?: string
          id?: string
          notes?: string | null
          personal_adjustment_days?: number
          personal_days_base?: number
          staff_member_id?: string
          updated_at?: string
          vacation_adjustment_days?: number
          vacation_days_base?: number
        }
        Relationships: []
      }
      staff_directory: {
        Row: {
          active: boolean
          color_tag: string | null
          contract_type: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_supervisor: boolean
          is_truck_driver: boolean
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          position: string | null
          sort_order: number
          staff_kind: Database["public"]["Enums"]["staff_kind"]
          start_date: string | null
          truck_driver_role: string | null
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          active?: boolean
          color_tag?: string | null
          contract_type?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_supervisor?: boolean
          is_truck_driver?: boolean
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          sort_order?: number
          staff_kind?: Database["public"]["Enums"]["staff_kind"]
          start_date?: string | null
          truck_driver_role?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          active?: boolean
          color_tag?: string | null
          contract_type?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_supervisor?: boolean
          is_truck_driver?: boolean
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          sort_order?: number
          staff_kind?: Database["public"]["Enums"]["staff_kind"]
          start_date?: string | null
          truck_driver_role?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: []
      }
      staff_events: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["staff_event_type"]
          id: string
          staff_member_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["staff_event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          end_date?: string | null
          event_type: Database["public"]["Enums"]["staff_event_type"]
          id?: string
          staff_member_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["staff_event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["staff_event_type"]
          id?: string
          staff_member_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["staff_event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_events_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_events_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_journeys: {
        Row: {
          badge_label: string | null
          color: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          journey_date: string
          notes: string | null
          shift: string
          staff_member_id: string | null
        }
        Insert: {
          badge_label?: string | null
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          journey_date: string
          notes?: string | null
          shift: string
          staff_member_id?: string | null
        }
        Update: {
          badge_label?: string | null
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          journey_date?: string
          notes?: string | null
          shift?: string
          staff_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_journeys_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_journeys_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          created_by_user_id: string
          ends_at: string | null
          id: string
          location: string | null
          notes: string | null
          shift_date: string
          shift_label: string
          shift_period: string | null
          staff_member_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          shift_date: string
          shift_label: string
          shift_period?: string | null
          staff_member_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          shift_date?: string
          shift_label?: string
          shift_period?: string | null
          staff_member_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          staff_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          staff_id: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          staff_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          label: string
          sort_order: number
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          label: string
          sort_order?: number
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          label?: string
          sort_order?: number
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_staff_id: string | null
          assignment_mode: Database["public"]["Enums"]["task_assignment_mode"]
          category: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          id: string
          is_all_day: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          related_machine_id: string | null
          reminder_at: string | null
          scope: Database["public"]["Enums"]["task_scope"]
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          assignment_mode?: Database["public"]["Enums"]["task_assignment_mode"]
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_all_day?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          related_machine_id?: string | null
          reminder_at?: string | null
          scope?: Database["public"]["Enums"]["task_scope"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          assignment_mode?: Database["public"]["Enums"]["task_assignment_mode"]
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_all_day?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          related_machine_id?: string | null
          reminder_at?: string | null
          scope?: Database["public"]["Enums"]["task_scope"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_machine_id_fkey"
            columns: ["related_machine_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          latitude_in: number | null
          latitude_out: number | null
          longitude_in: number | null
          longitude_out: number | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          latitude_in?: number | null
          latitude_out?: number | null
          longitude_in?: number | null
          longitude_out?: number | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          latitude_in?: number | null
          latitude_out?: number | null
          longitude_in?: number | null
          longitude_out?: number | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tonnage_daily_materials: {
        Row: {
          created_at: string
          id: string
          material_date: string
          notes: string | null
          qty_arenas_a: number
          qty_arenas_b: number
          qty_sulfatos: number
          qty_tortas: number
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_date: string
          notes?: string | null
          qty_arenas_a?: number
          qty_arenas_b?: number
          qty_sulfatos?: number
          qty_tortas?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_date?: string
          notes?: string | null
          qty_arenas_a?: number
          qty_arenas_b?: number
          qty_sulfatos?: number
          qty_tortas?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      tonnage_trips: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          driver_name_snapshot: string | null
          driver_staff_id: string | null
          driver_user_id: string | null
          id: string
          load_zone_id: string | null
          material_snapshot: string | null
          notes: string | null
          qty_arenas_a: number | null
          qty_arenas_b: number | null
          qty_sulfatos: number | null
          qty_tortas: number | null
          trip_date: string
          trip_time: string | null
          trip_type: string | null
          truck_id: string
          unload_zone_id: string | null
          updated_at: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          driver_name_snapshot?: string | null
          driver_staff_id?: string | null
          driver_user_id?: string | null
          id?: string
          load_zone_id?: string | null
          material_snapshot?: string | null
          notes?: string | null
          qty_arenas_a?: number | null
          qty_arenas_b?: number | null
          qty_sulfatos?: number | null
          qty_tortas?: number | null
          trip_date: string
          trip_time?: string | null
          trip_type?: string | null
          truck_id: string
          unload_zone_id?: string | null
          updated_at?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          driver_name_snapshot?: string | null
          driver_staff_id?: string | null
          driver_user_id?: string | null
          id?: string
          load_zone_id?: string | null
          material_snapshot?: string | null
          notes?: string | null
          qty_arenas_a?: number | null
          qty_arenas_b?: number | null
          qty_sulfatos?: number | null
          qty_tortas?: number | null
          trip_date?: string
          trip_time?: string | null
          trip_type?: string | null
          truck_id?: string
          unload_zone_id?: string | null
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "tonnage_trips_driver_staff_id_fkey"
            columns: ["driver_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tonnage_trips_driver_staff_id_fkey"
            columns: ["driver_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tonnage_trips_load_zone_id_fkey"
            columns: ["load_zone_id"]
            isOneToOne: false
            referencedRelation: "tonnage_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tonnage_trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "tonnage_trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tonnage_trips_unload_zone_id_fkey"
            columns: ["unload_zone_id"]
            isOneToOne: false
            referencedRelation: "tonnage_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tonnage_trucks: {
        Row: {
          created_at: string
          default_driver_user_id: string | null
          id: string
          is_active: boolean
          label: string
          machine_asset_id: string | null
          material: string
          notes: string | null
          sort_order: number
          truck_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_driver_user_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          machine_asset_id?: string | null
          material?: string
          notes?: string | null
          sort_order?: number
          truck_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_driver_user_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          machine_asset_id?: string | null
          material?: string
          notes?: string | null
          sort_order?: number
          truck_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tonnage_trucks_machine_asset_id_fkey"
            columns: ["machine_asset_id"]
            isOneToOne: false
            referencedRelation: "machine_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      tonnage_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          zone_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          zone_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          zone_type?: string
        }
        Relationships: []
      }
      user_nav_preferences: {
        Row: {
          hidden_sections: string[]
          scope: string
          section_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          hidden_sections?: string[]
          scope?: string
          section_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          hidden_sections?: string[]
          scope?: string
          section_order?: string[]
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          end_date: string
          id: string
          reason: string | null
          request_type: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          staff_member_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          request_type?: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          staff_member_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          request_type?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          staff_member_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vacation_slots: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          shift: Database["public"]["Enums"]["shift_slot"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          shift: Database["public"]["Enums"]["shift_slot"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          shift?: Database["public"]["Enums"]["shift_slot"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_slots_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_year_summary"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "vacation_slots_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_report_photos: {
        Row: {
          caption: string | null
          id: string
          storage_path: string
          uploaded_at: string
          uploaded_by_user_id: string
          work_report_id: string
        }
        Insert: {
          caption?: string | null
          id?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by_user_id: string
          work_report_id: string
        }
        Update: {
          caption?: string | null
          id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by_user_id?: string
          work_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_report_photos_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_reports: {
        Row: {
          action: string | null
          created_at: string
          description: string
          ended_at: string | null
          ended_latitude: number | null
          ended_longitude: number | null
          id: string
          machine: string | null
          observations: string | null
          started_at: string
          started_latitude: number | null
          started_longitude: number | null
          updated_at: string
          user_id: string
          worker_name: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          description?: string
          ended_at?: string | null
          ended_latitude?: number | null
          ended_longitude?: number | null
          id?: string
          machine?: string | null
          observations?: string | null
          started_at?: string
          started_latitude?: number | null
          started_longitude?: number | null
          updated_at?: string
          user_id: string
          worker_name?: string
        }
        Update: {
          action?: string | null
          created_at?: string
          description?: string
          ended_at?: string | null
          ended_latitude?: number | null
          ended_longitude?: number | null
          id?: string
          machine?: string | null
          observations?: string | null
          started_at?: string
          started_latitude?: number | null
          started_longitude?: number | null
          updated_at?: string
          user_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          annual_contract_hours: number
          color_hex: string
          company_vacation_hours: number
          created_at: string
          display_name: string
          extra_vacation_days: number
          extra_vacation_reason: string | null
          id: string
          is_active: boolean
          linked_staff_member_id: string | null
          linked_user_id: string | null
          name: string
          shift_default: Database["public"]["Enums"]["shift_default_type"]
          total_annual_hours: number
          updated_at: string
          worker_vacation_days: number
        }
        Insert: {
          annual_contract_hours?: number
          color_hex: string
          company_vacation_hours?: number
          created_at?: string
          display_name: string
          extra_vacation_days?: number
          extra_vacation_reason?: string | null
          id?: string
          is_active?: boolean
          linked_staff_member_id?: string | null
          linked_user_id?: string | null
          name: string
          shift_default?: Database["public"]["Enums"]["shift_default_type"]
          total_annual_hours?: number
          updated_at?: string
          worker_vacation_days?: number
        }
        Update: {
          annual_contract_hours?: number
          color_hex?: string
          company_vacation_hours?: number
          created_at?: string
          display_name?: string
          extra_vacation_days?: number
          extra_vacation_reason?: string | null
          id?: string
          is_active?: boolean
          linked_staff_member_id?: string | null
          linked_user_id?: string | null
          name?: string
          shift_default?: Database["public"]["Enums"]["shift_default_type"]
          total_annual_hours?: number
          updated_at?: string
          worker_vacation_days?: number
        }
        Relationships: []
      }
    }
    Views: {
      staff_directory_public: {
        Row: {
          active: boolean | null
          color_tag: string | null
          full_name: string | null
          id: string | null
          is_supervisor: boolean | null
          linked_user_id: string | null
          sort_order: number | null
          staff_kind: Database["public"]["Enums"]["staff_kind"] | null
        }
        Insert: {
          active?: boolean | null
          color_tag?: string | null
          full_name?: string | null
          id?: string | null
          is_supervisor?: boolean | null
          linked_user_id?: string | null
          sort_order?: number | null
          staff_kind?: Database["public"]["Enums"]["staff_kind"] | null
        }
        Update: {
          active?: boolean | null
          color_tag?: string | null
          full_name?: string | null
          id?: string | null
          is_supervisor?: boolean | null
          linked_user_id?: string | null
          sort_order?: number | null
          staff_kind?: Database["public"]["Enums"]["staff_kind"] | null
        }
        Relationships: []
      }
      time_entries_with_profiles: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          latitude_in: number | null
          latitude_out: number | null
          longitude_in: number | null
          longitude_out: number | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      worker_year_summary: {
        Row: {
          extra_days: number | null
          remaining_hours: number | null
          total_annual_hours: number | null
          vacation_days_total: number | null
          vacation_days_used: number | null
          worked_hours: number | null
          worker_id: string | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_vacation_balance_adjustment: {
        Args: {
          p_days: number
          p_direction: number
          p_request_type: string
          p_staff_member_id: string
        }
        Returns: undefined
      }
      can_access_chat_channel: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      can_access_staff_member: {
        Args: { _staff_member_id: string }
        Returns: boolean
      }
      can_access_task: { Args: { _task_id: string }; Returns: boolean }
      can_manage_chat_channel: {
        Args: { _channel_id: string }
        Returns: boolean
      }
      can_manage_vacation_journeys: { Args: never; Returns: boolean }
      clear_journey_assignment: {
        Args: { p_journey_date: string; p_shift: string }
        Returns: boolean
      }
      count_pending_tasks: { Args: never; Returns: number }
      count_request_days: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      count_unread_messages: { Args: never; Returns: number }
      create_notification: {
        Args: {
          _body: string
          _kind: Database["public"]["Enums"]["notification_kind"]
          _link: string
          _related_id: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      create_private_group: {
        Args: { _description: string; _member_ids: string[]; _name: string }
        Returns: string
      }
      delete_journey_assignment: {
        Args: { p_journey_date: string; p_shift: string }
        Returns: boolean
      }
      ensure_current_user_setup: {
        Args: { _full_name?: string }
        Returns: undefined
      }
      get_consumption_average: { Args: { _card_id: string }; Returns: number }
      get_fuel_balance: {
        Args: never
        Returns: {
          current_balance: number
          is_below_threshold: boolean
          is_negative: boolean
          last_recharge_amount: number
          last_recharge_date: string
          threshold: number
        }[]
      }
      get_or_create_direct_channel: {
        Args: { _other_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_channel_member: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: boolean
      }
      is_task_private: { Args: { _task_id: string }; Returns: boolean }
      mark_channel_read: { Args: { p_channel_id: string }; Returns: undefined }
      next_delivery_note_number: { Args: never; Returns: string }
      set_journey_assignment: {
        Args: {
          p_badge_label?: string
          p_color?: string
          p_journey_date: string
          p_shift: string
          p_staff_member_id?: string
        }
        Returns: string
      }
      sync_current_user_staff_link: {
        Args: { _full_name?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "secretary" | "kiosk_viajes"
      calendar_event_type:
        | "task_deadline"
        | "workday"
        | "leave"
        | "training"
        | "medical_review"
        | "course"
        | "meeting"
        | "itv"
        | "maintenance"
        | "personal"
      delivery_note_status: "pending" | "validated" | "incident" | "archived"
      holiday_type:
        | "festivo_nacional"
        | "cierre_fabrica"
        | "festivo_local"
        | "otro"
      machine_issue_horizon: "short_term" | "medium_term" | "long_term"
      machine_issue_status: "open" | "monitoring" | "resolved"
      machine_service_type:
        | "maintenance"
        | "inspection"
        | "itv"
        | "oil_hydraulic"
        | "oil_engine"
        | "coolant"
        | "general_check"
      machine_status:
        | "active"
        | "maintenance"
        | "repair"
        | "inspection"
        | "inactive"
      notification_kind:
        | "task_assigned"
        | "chat_message"
        | "vacation_response"
        | "machine_incident"
        | "work_report"
        | "delivery_note"
        | "fuel_alert"
      shift_default_type: "dia" | "tarde" | "noche" | "variable"
      shift_slot: "dia" | "tarde" | "noche"
      staff_event_status: "planned" | "active" | "completed" | "cancelled"
      staff_event_type:
        | "completed_work"
        | "pending_work"
        | "leave"
        | "work_calendar"
        | "medical_review"
        | "training"
        | "course"
        | "note"
      staff_kind: "worker" | "manager" | "admin_support"
      task_assignment_mode: "individual" | "group" | "all"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_scope: "personal" | "general"
      task_status:
        | "planned"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "worker", "secretary", "kiosk_viajes"],
      calendar_event_type: [
        "task_deadline",
        "workday",
        "leave",
        "training",
        "medical_review",
        "course",
        "meeting",
        "itv",
        "maintenance",
        "personal",
      ],
      delivery_note_status: ["pending", "validated", "incident", "archived"],
      holiday_type: [
        "festivo_nacional",
        "cierre_fabrica",
        "festivo_local",
        "otro",
      ],
      machine_issue_horizon: ["short_term", "medium_term", "long_term"],
      machine_issue_status: ["open", "monitoring", "resolved"],
      machine_service_type: [
        "maintenance",
        "inspection",
        "itv",
        "oil_hydraulic",
        "oil_engine",
        "coolant",
        "general_check",
      ],
      machine_status: [
        "active",
        "maintenance",
        "repair",
        "inspection",
        "inactive",
      ],
      notification_kind: [
        "task_assigned",
        "chat_message",
        "vacation_response",
        "machine_incident",
        "work_report",
        "delivery_note",
        "fuel_alert",
      ],
      shift_default_type: ["dia", "tarde", "noche", "variable"],
      shift_slot: ["dia", "tarde", "noche"],
      staff_event_status: ["planned", "active", "completed", "cancelled"],
      staff_event_type: [
        "completed_work",
        "pending_work",
        "leave",
        "work_calendar",
        "medical_review",
        "training",
        "course",
        "note",
      ],
      staff_kind: ["worker", "manager", "admin_support"],
      task_assignment_mode: ["individual", "group", "all"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_scope: ["personal", "general"],
      task_status: [
        "planned",
        "in_progress",
        "blocked",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
