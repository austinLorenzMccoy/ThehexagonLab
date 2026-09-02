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
          contract_status: string
          referral_code: string | null
          hourly_rate_usd: number | null
          paystack_recipient_code: string | null
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
          contract_status?: string
          referral_code?: string | null
          hourly_rate_usd?: number | null
          paystack_recipient_code?: string | null
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
          contract_status?: string
          referral_code?: string | null
          hourly_rate_usd?: number | null
          paystack_recipient_code?: string | null
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
      worker_timesheets: {
        Row: {
          id: string
          worker_user_id: string
          platform_id: number | null
          work_date: string
          hours_worked: number
          hourly_rate_usd: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          platform_id?: number | null
          work_date?: string
          hours_worked: number
          hourly_rate_usd: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          platform_id?: number | null
          work_date?: string
          hours_worked?: number
          hourly_rate_usd?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pay_slips: {
        Row: {
          id: string
          worker_user_id: string
          platform_id: number | null
          period_month: string
          period_year: number
          expected_amount_usd: number
          currency: string
          slip_file_url: string | null
          issued_by: string | null
          issued_at: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          platform_id?: number | null
          period_month: string
          period_year: number
          expected_amount_usd?: number
          currency?: string
          slip_file_url?: string | null
          issued_by?: string | null
          issued_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          platform_id?: number | null
          period_month?: string
          period_year?: number
          expected_amount_usd?: number
          currency?: string
          slip_file_url?: string | null
          issued_by?: string | null
          issued_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          worker_user_id: string
          pay_slip_id: string | null
          amount_usd: number
          status: string
          method: string
          paystack_reference: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          pay_slip_id?: string | null
          amount_usd: number
          status?: string
          method?: string
          paystack_reference?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          pay_slip_id?: string | null
          amount_usd?: number
          status?: string
          method?: string
          paystack_reference?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warning_events: {
        Row: {
          id: string
          worker_user_id: string
          issued_by: string | null
          reason: string
          comment: string | null
          is_revoked: boolean
          revoked_by: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          issued_by?: string | null
          reason: string
          comment?: string | null
          is_revoked?: boolean
          revoked_by?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          issued_by?: string | null
          reason?: string
          comment?: string | null
          is_revoked?: boolean
          revoked_by?: string | null
          revoked_at?: string | null
          created_at?: string
        }
      }
      worker_feedback: {
        Row: {
          id: string
          worker_user_id: string
          category: string
          subject: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          category?: string
          subject: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          category?: string
          subject?: string
          message?: string
          created_at?: string
        }
      }
      disputes: {
        Row: {
          id: string
          worker_user_id: string
          pay_slip_id: string | null
          subject: string
          description: string
          status: string
          resolution_notes: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          worker_user_id: string
          pay_slip_id?: string | null
          subject: string
          description: string
          status?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_user_id?: string
          pay_slip_id?: string | null
          subject?: string
          description?: string
          status?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_user_id: string
          referred_worker_user_id: string | null
          referred_name: string
          referred_email: string | null
          status: string
          commission_usd: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_user_id: string
          referred_worker_user_id?: string | null
          referred_name: string
          referred_email?: string | null
          status?: string
          commission_usd?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_user_id?: string
          referred_worker_user_id?: string | null
          referred_name?: string
          referred_email?: string | null
          status?: string
          commission_usd?: number
          created_at?: string
          updated_at?: string
        }
      }
      payout_requests: {
        Row: {
          id: string
          requester_user_id: string
          type: string
          amount_usd: number
          status: string
          paystack_reference: string | null
          notes: string | null
          requested_at: string
          processed_by: string | null
          processed_at: string | null
        }
        Insert: {
          id?: string
          requester_user_id: string
          type?: string
          amount_usd: number
          status?: string
          paystack_reference?: string | null
          notes?: string | null
          requested_at?: string
          processed_by?: string | null
          processed_at?: string | null
        }
        Update: {
          id?: string
          requester_user_id?: string
          type?: string
          amount_usd?: number
          status?: string
          paystack_reference?: string | null
          notes?: string | null
          requested_at?: string
          processed_by?: string | null
          processed_at?: string | null
        }
      }
      partner_contacts: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          country: string | null
          contact_type: string
          source: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          country?: string | null
          contact_type?: string
          source?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          country?: string | null
          contact_type?: string
          source?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      worker_earnings_summary: {
        Row: {
          worker_user_id: string
          display_name: string | null
          email: string
          contract_status: string
          month_hours: number
          month_earnings_usd: number
          total_paid_usd: number
          pending_usd: number
          active_warnings: number
          latest_expected_amount_usd: number | null
          latest_period_month: string | null
          latest_period_year: number | null
        }
      }
      referral_summary: {
        Row: {
          referrer_user_id: string
          display_name: string | null
          email: string
          referral_code: string | null
          total_referred: number
          paid_count: number
          pending_count: number
          active_count: number
          total_commission_usd: number
          eligible_for_payout: boolean
        }
      }
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
