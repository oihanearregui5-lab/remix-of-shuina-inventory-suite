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
          created_at: string
          created_by_user_id: string
          customer: string
          delivery_date: string
          driver_name: string | null
          driver_staff_id: string | null
          id: string
          note_number: string
          observations: string | null
          pdf_storage_path: string | null
          route: string | null
          status: Database["public"]["Enums"]["delivery_note_status"]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          customer: string
          delivery_date?: string
          driver_name?: string | null
          driver_staff_id?: string | null
          id?: string
          note_number: string
          observations?: string | null
          pdf_storage_path?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["delivery_note_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          customer?: string
          delivery_date?: string
          driver_name?: string | null
          driver_staff_id?: string | null
          id?: string
          note_number?: string
          observations?: string | null
          pdf_storage_path?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["delivery_note_status"]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_driver_staff_id_fkey"
            columns: ["driver_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_driver_staff_id_fkey"
            columns: ["driver_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_directory_public"
            referencedColumns: ["id"]
          },
        ]
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
          asset_code: string | null
          asset_family: string
          created_at: string
          display_name: string
          id: string
          license_plate: string | null
          next_inspection_date: string | null
          next_itv_date: string | null
          notes: string | null
          photo_url: string | null
          provider_contact: string | null
          provider_name: string | null
          provider_notes: string | null
          status: Database["public"]["Enums"]["machine_status"]
          updated_at: string
        }
        Insert: {
          asset_code?: string | null
          asset_family: string
          created_at?: string
          display_name: string
          id?: string
          license_plate?: string | null
          next_inspection_date?: string | null
          next_itv_date?: string | null
          notes?: string | null
          photo_url?: string | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_notes?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
        }
        Update: {
          asset_code?: string | null
          asset_family?: string
          created_at?: string
          display_name?: string
          id?: string
          license_plate?: string | null
          next_inspection_date?: string | null
          next_itv_date?: string | null
          notes?: string | null
          photo_url?: string | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_notes?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
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
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
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
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          position: string | null
          sort_order: number
          staff_kind: Database["public"]["Enums"]["staff_kind"]
          start_date: string | null
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
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          sort_order?: number
          staff_kind?: Database["public"]["Enums"]["staff_kind"]
          start_date?: string | null
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
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          sort_order?: number
          staff_kind?: Database["public"]["Enums"]["staff_kind"]
          start_date?: string | null
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
      create_private_group: {
        Args: { _description: string; _member_ids: string[]; _name: string }
        Returns: string
      }
      ensure_current_user_setup: {
        Args: { _full_name?: string }
        Returns: undefined
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
      sync_current_user_staff_link: {
        Args: { _full_name?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "secretary"
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
      app_role: ["admin", "worker", "secretary"],
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
