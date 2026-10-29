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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          body: string
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          link_target: Json | null
          reactions: Json | null
          sender_id: string | null
          type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          body: string
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          link_target?: Json | null
          reactions?: Json | null
          sender_id?: string | null
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          link_target?: Json | null
          reactions?: Json | null
          sender_id?: string | null
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_assignments: {
        Row: {
          chore_id: string
          completed_today: boolean | null
          created_at: string | null
          deleted_at: string | null
          id: string
          kudos: Json | null
          last_photo_url: string | null
          round_id: string
          scheduled_days: string[]
          scheduled_time: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          chore_id: string
          completed_today?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          kudos?: Json | null
          last_photo_url?: string | null
          round_id: string
          scheduled_days?: string[]
          scheduled_time?: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          chore_id?: string
          completed_today?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          kudos?: Json | null
          last_photo_url?: string | null
          round_id?: string
          scheduled_days?: string[]
          scheduled_time?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chore_assignments_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_assignments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "draft_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chore_logs: {
        Row: {
          chore_id: string
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          kudos: Json | null
          note: string | null
          photo_url: string | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          chore_id: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          kudos?: Json | null
          note?: string | null
          photo_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          chore_id?: string
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          kudos?: Json | null
          note?: string | null
          photo_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chore_logs_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chore_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          active: boolean
          created_at: string | null
          deleted_at: string | null
          description: string | null
          effort_level: Database["public"]["Enums"]["effort_level"]
          frequency: Database["public"]["Enums"]["chore_frequency"]
          household_id: string
          icon_name: string | null
          id: string
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          effort_level?: Database["public"]["Enums"]["effort_level"]
          frequency?: Database["public"]["Enums"]["chore_frequency"]
          household_id: string
          icon_name?: string | null
          id?: string
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          effort_level?: Database["public"]["Enums"]["effort_level"]
          frequency?: Database["public"]["Enums"]["chore_frequency"]
          household_id?: string
          icon_name?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chores_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_picks: {
        Row: {
          chore_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          pick_type: Database["public"]["Enums"]["pick_type"]
          round_id: string
          target_user_id: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          chore_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          pick_type: Database["public"]["Enums"]["pick_type"]
          round_id: string
          target_user_id?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          chore_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          pick_type?: Database["public"]["Enums"]["pick_type"]
          round_id?: string
          target_user_id?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_picks_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "draft_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_rounds: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          revealed_at: string | null
          status: Database["public"]["Enums"]["draft_status"]
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          revealed_at?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          revealed_at?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_rounds_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          dispute_reason: string | null
          expense_id: string
          id: string
          response: Database["public"]["Enums"]["share_response"]
          share_amount: number
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          dispute_reason?: string | null
          expense_id: string
          id?: string
          response?: Database["public"]["Enums"]["share_response"]
          share_amount: number
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          dispute_reason?: string | null
          expense_id?: string
          id?: string
          response?: Database["public"]["Enums"]["share_response"]
          share_amount?: number
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          date: string
          deleted_at: string | null
          dispute_reason: string | null
          household_id: string
          id: string
          paid_by: string
          receipt_url: string | null
          status: Database["public"]["Enums"]["expense_status"]
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          dispute_reason?: string | null
          household_id: string
          id?: string
          paid_by: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          dispute_reason?: string | null
          household_id?: string
          id?: string
          paid_by?: string
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favor_tokens: {
        Row: {
          balance: number
          created_at: string | null
          deleted_at: string | null
          history: Json | null
          household_id: string
          id: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          deleted_at?: string | null
          history?: Json | null
          household_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          deleted_at?: string | null
          history?: Json | null
          household_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "favor_tokens_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favor_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      house_agreements: {
        Row: {
          agreed_at: string | null
          category: string
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          text: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agreed_at?: string | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          text: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agreed_at?: string | null
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          text?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "house_agreements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          deleted_at: string | null
          id: string
          invite_code: string
          invites_enabled: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          deleted_at?: string | null
          id?: string
          invite_code: string
          invites_enabled?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          deleted_at?: string | null
          id?: string
          invite_code?: string
          invites_enabled?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          status: string
          updated_at: string | null
          user_avatar: string | null
          user_country: string | null
          user_email: string
          user_flag: string | null
          user_name: string
          version: number | null
          votes: Json | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_avatar?: string | null
          user_country?: string | null
          user_email: string
          user_flag?: string | null
          user_name: string
          version?: number | null
          votes?: Json | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_avatar?: string | null
          user_country?: string | null
          user_email?: string
          user_flag?: string | null
          user_name?: string
          version?: number | null
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_issues: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          household_id: string
          id: string
          photos: string[] | null
          reported_by: string
          status: string
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          household_id: string
          id?: string
          photos?: string[] | null
          reported_by: string
          status?: string
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          household_id?: string
          id?: string
          photos?: string[] | null
          reported_by?: string
          status?: string
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_issues_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_topics: {
        Row: {
          comments: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          household_id: string
          id: string
          proposed_by: string
          status: Database["public"]["Enums"]["topic_status"]
          title: string
          updated_at: string | null
          version: number | null
          votes: Json | null
        }
        Insert: {
          comments?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          household_id: string
          id?: string
          proposed_by: string
          status?: Database["public"]["Enums"]["topic_status"]
          title: string
          updated_at?: string | null
          version?: number | null
          votes?: Json | null
        }
        Update: {
          comments?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          household_id?: string
          id?: string
          proposed_by?: string
          status?: Database["public"]["Enums"]["topic_status"]
          title?: string
          updated_at?: string | null
          version?: number | null
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_topics_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topics_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      move_in_snapshots: {
        Row: {
          condition_notes: string | null
          confirmed_by: Json | null
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          photos: string[] | null
          room_name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          condition_notes?: string | null
          confirmed_by?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          photos?: string[] | null
          room_name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          condition_notes?: string | null
          confirmed_by?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          photos?: string[] | null
          room_name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "move_in_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          deleted_at: string | null
          id: string
          link_target: Json | null
          read: boolean
          title: string
          type: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          body: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          link_target?: Json | null
          read?: boolean
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          link_target?: Json | null
          read?: boolean
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          away_until: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          flag: string | null
          id: string
          is_home: boolean | null
          name: string
          points: number | null
          settings: Json | null
          streak_days: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          avatar?: string | null
          away_until?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          flag?: string | null
          id: string
          is_home?: boolean | null
          name: string
          points?: number | null
          settings?: Json | null
          streak_days?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          avatar?: string | null
          away_until?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          flag?: string | null
          id?: string
          is_home?: boolean | null
          name?: string
          points?: number | null
          settings?: Json | null
          streak_days?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          active: boolean
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          deleted_at: string | null
          due_day: number
          household_id: string
          id: string
          payer_id: string | null
          split_rule: Json
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          deleted_at?: string | null
          due_day: number
          household_id: string
          id?: string
          payer_id?: string | null
          split_rule?: Json
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          deleted_at?: string | null
          due_day?: number
          household_id?: string
          id?: string
          payer_id?: string | null
          split_rule?: Json
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          from_user: string
          household_id: string
          id: string
          status: Database["public"]["Enums"]["settlement_status"]
          to_user: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          from_user: string
          household_id: string
          id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          to_user: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          from_user?: string
          household_id?: string
          id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          to_user?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          added_by: string
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          is_low: boolean
          name: string
          purchased_at: string | null
          purchased_by: string | null
          status: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          added_by: string
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          is_low?: boolean
          name: string
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          added_by?: string
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_low?: boolean
          name?: string
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_pulses: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          household_id: string
          id: string
          score: number
          updated_at: string | null
          version: number | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          household_id: string
          id?: string
          score: number
          updated_at?: string | null
          version?: number | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          household_id?: string
          id?: string
          score?: number
          updated_at?: string | null
          version?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_pulses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { h_id: string }; Returns: boolean }
    }
    Enums: {
      chore_frequency: "daily" | "weekly"
      currency_code: "TRY" | "USD" | "EUR"
      draft_status: "collecting" | "ready_to_reveal" | "revealed"
      effort_level: "light" | "medium" | "heavy"
      expense_category:
        | "groceries"
        | "household"
        | "utilities"
        | "rent"
        | "other"
      expense_status: "pending" | "agreed" | "disputed" | "cancelled"
      kudos_type: "thanks" | "great_job" | "needs_look"
      membership_status: "pending" | "active" | "left"
      pick_type: "want" | "avoid" | "suggest_for"
      settlement_status: "marked_paid" | "confirmed"
      share_response: "pending" | "agreed" | "disputed"
      topic_status: "open" | "agreed" | "archived"
      topic_vote: "agree" | "disagree" | "neutral"
      user_role: "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      chore_frequency: ["daily", "weekly"],
      currency_code: ["TRY", "USD", "EUR"],
      draft_status: ["collecting", "ready_to_reveal", "revealed"],
      effort_level: ["light", "medium", "heavy"],
      expense_category: [
        "groceries",
        "household",
        "utilities",
        "rent",
        "other",
      ],
      expense_status: ["pending", "agreed", "disputed", "cancelled"],
      kudos_type: ["thanks", "great_job", "needs_look"],
      membership_status: ["pending", "active", "left"],
      pick_type: ["want", "avoid", "suggest_for"],
      settlement_status: ["marked_paid", "confirmed"],
      share_response: ["pending", "agreed", "disputed"],
      topic_status: ["open", "agreed", "archived"],
      topic_vote: ["agree", "disagree", "neutral"],
      user_role: ["admin", "member"],
    },
  },
} as const
