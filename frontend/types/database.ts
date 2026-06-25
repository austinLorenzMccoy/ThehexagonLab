export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      platforms: {
        Row: {
          id: number
          slug: string
          label: string
          icon: string
          color_hex: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          slug: string
          label: string
          icon: string
          color_hex: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          slug?: string
          label?: string
          icon?: string
          color_hex?: string
          is_active?: boolean
          created_at?: string
        }
      }
      app_users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: string
          platform_access: string[] | null
          worker_id: string | null
          can_view_orders: boolean
          is_active: boolean
          last_sign_in: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: string
          platform_access?: string[] | null
          worker_id?: string | null
          can_view_orders?: boolean
          is_active?: boolean
          last_sign_in?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: string
          platform_access?: string[] | null
          worker_id?: string | null
          can_view_orders?: boolean
          is_active?: boolean
          last_sign_in?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      platform_task_columns: {
        Row: {
          id: number
          platform_id: number
          column_key: string
          column_label: string
          sort_order: number
          is_active: boolean
        }
        Insert: {
          id?: number
          platform_id: number
          column_key: string
          column_label: string
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          id?: number
          platform_id?: number
          column_key?: string
          column_label?: string
          sort_order?: number
          is_active?: boolean
        }
      }
      worker_tracker: {
        Row: {
          id: string
          platform_id: number
          owner_name: string
          linker: string
          worker_name: string
          email: string | null
          apple_connect_pw: string | null
          platform_id_code: string | null
          payoneer_linked: string
          warning_level: string
          sow_done: string
          le_cert: string
          task_statuses: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_id: number
          owner_name: string
          linker: string
          worker_name: string
          email?: string | null
          apple_connect_pw?: string | null
          platform_id_code?: string | null
          payoneer_linked?: string
          warning_level?: string
          sow_done?: string
          le_cert?: string
          task_statuses?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_id?: number
          owner_name?: string
          linker?: string
          worker_name?: string
          email?: string | null
          apple_connect_pw?: string | null
          platform_id_code?: string | null
          payoneer_linked?: string
          warning_level?: string
          sow_done?: string
          le_cert?: string
          task_statuses?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_status_history: {
        Row: {
          id: string
          tracker_row_id: string
          column_key: string
          old_value: string | null
          new_value: string
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          tracker_row_id: string
          column_key: string
          old_value?: string | null
          new_value: string
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          tracker_row_id?: string
          column_key?: string
          old_value?: string | null
          new_value?: string
          changed_by?: string | null
          changed_at?: string
        }
      }
      workers_registry: {
        Row: {
          id: string
          platform_id: number
          project_task: string
          owner_name: string
          account_type: string
          email: string | null
          passport: string | null
          geowork_test: string
          date_started: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_id: number
          project_task: string
          owner_name: string
          account_type: string
          email?: string | null
          passport?: string | null
          geowork_test?: string
          date_started?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_id?: number
          project_task?: string
          owner_name?: string
          account_type?: string
          email?: string | null
          passport?: string | null
          geowork_test?: string
          date_started?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          platform_id: number
          order_id_code: string
          proxy: string | null
          owner_name: string
          status: string
          order_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_id: number
          order_id_code: string
          proxy?: string | null
          owner_name: string
          status?: string
          order_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_id?: number
          order_id_code?: string
          proxy?: string | null
          owner_name?: string
          status?: string
          order_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll: {
        Row: {
          id: string
          platform_id: number
          account_code: string
          worker_name: string
          month: string
          year: number
          tasks_done: number
          pay_usd: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          platform_id: number
          account_code: string
          worker_name: string
          month: string
          year?: number
          tasks_done?: number
          pay_usd?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          platform_id?: number
          account_code?: string
          worker_name?: string
          month?: string
          year?: number
          tasks_done?: number
          pay_usd?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      warning_summary: {
        Row: {
          platform_id: number
          platform_slug: string
          platform_label: string
          icon: string
          color_hex: string
          total_workers: number
          clear_count: number
          minor_count: number
          serious_count: number
          banned_count: number
        }
      }
      order_summary: {
        Row: {
          platform_id: number
          platform_slug: string
          platform_label: string
          icon: string
          total_orders: number
          active_count: number
          pending_count: number
          processing_count: number
          issue_count: number
          completed_count: number
          cancelled_count: number
        }
      }
      platform_stats: {
        Row: {
          platform_id: number
          platform_slug: string
          platform_label: string
          icon: string
          color_hex: string
          total_workers: number
          clear_count: number
          minor_count: number
          serious_count: number
          banned_count: number
          total_orders: number
          issue_orders: number
          total_payroll_usd: number
        }
      }
    }
  }
}
