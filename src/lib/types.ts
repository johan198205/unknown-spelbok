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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          meta: Json | null
          target: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          bookmaker_id: string
          clicked_at: string
          id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          bookmaker_id: string
          clicked_at?: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          bookmaker_id?: string
          clicked_at?: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "affiliate_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banner_events: {
        Row: {
          banner_id: string
          event: string
          id: string
          occurred_at: string
        }
        Insert: {
          banner_id: string
          event: string
          id?: string
          occurred_at?: string
        }
        Update: {
          banner_id?: string
          event?: string
          id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_events_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banner_stats"
            referencedColumns: ["banner_id"]
          },
          {
            foreignKeyName: "banner_events_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "banners"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          link_url: string | null
          placement: string
          sort: number
          starts_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          placement?: string
          sort?: number
          starts_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          placement?: string
          sort?: number
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          bookmaker_id: string | null
          fixture_id: number | null
          id: string
          league: string | null
          league_id: number | null
          league_logo: string | null
          logged_before_kickoff: boolean | null
          match: string
          notify_goals: boolean
          odds: number
          payout: number | null
          pick: string
          placed_at: string
          result: string
          settled_at: string | null
          settled_by: string | null
          sheet_id: string
          sport: string | null
          stake: number
          user_id: string
          copied_from_bet_id: string | null
          copied_from_user_id: string | null
          import_source: string | null
          import_external_id: string | null
          import_source_url: string | null
        }
        Insert: {
          bookmaker_id?: string | null
          fixture_id?: number | null
          id?: string
          league?: string | null
          league_id?: number | null
          league_logo?: string | null
          logged_before_kickoff?: boolean | null
          match: string
          notify_goals?: boolean
          odds: number
          payout?: number | null
          pick: string
          placed_at?: string
          result?: string
          settled_at?: string | null
          settled_by?: string | null
          sheet_id: string
          sport?: string | null
          stake: number
          user_id: string
          copied_from_bet_id?: string | null
          copied_from_user_id?: string | null
          import_source?: string | null
          import_external_id?: string | null
          import_source_url?: string | null
        }
        Update: {
          bookmaker_id?: string | null
          fixture_id?: number | null
          id?: string
          league?: string | null
          league_id?: number | null
          league_logo?: string | null
          logged_before_kickoff?: boolean | null
          match?: string
          notify_goals?: boolean
          odds?: number
          payout?: number | null
          pick?: string
          placed_at?: string
          result?: string
          settled_at?: string | null
          settled_by?: string | null
          sheet_id?: string
          sport?: string | null
          stake?: number
          user_id?: string
          copied_from_bet_id?: string | null
          copied_from_user_id?: string | null
          import_source?: string | null
          import_external_id?: string | null
          import_source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["fixture_id"]
          },
          {
            foreignKeyName: "bets_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmakers: {
        Row: {
          active: boolean
          bonus: string | null
          bonus_value: number | null
          fast_payout: boolean
          id: string
          logo_url: string | null
          minus: string[] | null
          name: string
          payments: string[] | null
          plus: string[] | null
          rank: number
          rating: number | null
          review: string | null
          slug: string
          terms: string | null
          tracking_url: string | null
          updated_at: string
          usp: string | null
        }
        Insert: {
          active?: boolean
          bonus?: string | null
          bonus_value?: number | null
          fast_payout?: boolean
          id?: string
          logo_url?: string | null
          minus?: string[] | null
          name: string
          payments?: string[] | null
          plus?: string[] | null
          rank?: number
          rating?: number | null
          review?: string | null
          slug: string
          terms?: string | null
          tracking_url?: string | null
          updated_at?: string
          usp?: string | null
        }
        Update: {
          active?: boolean
          bonus?: string | null
          bonus_value?: number | null
          fast_payout?: boolean
          id?: string
          logo_url?: string | null
          minus?: string[] | null
          name?: string
          payments?: string[] | null
          plus?: string[] | null
          rank?: number
          rating?: number | null
          review?: string | null
          slug?: string
          terms?: string | null
          tracking_url?: string | null
          updated_at?: string
          usp?: string | null
        }
        Relationships: []
      }
      competition_entries: {
        Row: {
          competition_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          ends_at: string
          id: string
          min_bets: number
          min_total_stake: number
          name: string
          prize: string | null
          starts_at: string
          visibility: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          min_bets?: number
          min_total_stake?: number
          name: string
          prize?: string | null
          starts_at: string
          visibility?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          min_bets?: number
          min_total_stake?: number
          name?: string
          prize?: string | null
          starts_at?: string
          visibility?: string
        }
        Relationships: []
      }
      daily_suggestions: {
        Row: {
          ai_generated_at: string | null
          ai_reason: string | null
          away_logo: string | null
          away_team: string
          away_team_id: number | null
          clicked: boolean
          created_at: string
          dismissed: boolean
          fixture_id: number
          home_logo: string | null
          home_team: string
          home_team_id: number | null
          id: string
          kickoff: string
          league_id: number
          league_logo: string | null
          league_name: string
          match_score: number
          reasons: Json
          sport: string
          suggested_bet_type: string | null
          suggestion_date: string
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_reason?: string | null
          away_logo?: string | null
          away_team: string
          away_team_id?: number | null
          clicked?: boolean
          created_at?: string
          dismissed?: boolean
          fixture_id: number
          home_logo?: string | null
          home_team: string
          home_team_id?: number | null
          id?: string
          kickoff: string
          league_id: number
          league_logo?: string | null
          league_name: string
          match_score: number
          reasons?: Json
          sport: string
          suggested_bet_type?: string | null
          suggestion_date: string
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_reason?: string | null
          away_logo?: string | null
          away_team?: string
          away_team_id?: number | null
          clicked?: boolean
          created_at?: string
          dismissed?: boolean
          fixture_id?: number
          home_logo?: string | null
          home_team?: string
          home_team_id?: number | null
          id?: string
          kickoff?: string
          league_id?: number
          league_logo?: string | null
          league_name?: string
          match_score?: number
          reasons?: Json
          sport?: string
          suggested_bet_type?: string | null
          suggestion_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generation_log: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_log_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "daily_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          away_logo: string | null
          away_name: string | null
          away_score: number | null
          away_team_id: number | null
          elapsed: number | null
          fixture_id: number
          home_logo: string | null
          home_name: string | null
          home_score: number | null
          home_team_id: number | null
          kickoff: string
          league_id: number | null
          league_logo: string | null
          league_name: string | null
          raw: Json | null
          season: number | null
          sport: string
          status: string
          updated_at: string
        }
        Insert: {
          away_logo?: string | null
          away_name?: string | null
          away_score?: number | null
          away_team_id?: number | null
          elapsed?: number | null
          fixture_id: number
          home_logo?: string | null
          home_name?: string | null
          home_score?: number | null
          home_team_id?: number | null
          kickoff: string
          league_id?: number | null
          league_logo?: string | null
          league_name?: string | null
          raw?: Json | null
          season?: number | null
          sport?: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_logo?: string | null
          away_name?: string | null
          away_score?: number | null
          away_team_id?: number | null
          elapsed?: number | null
          fixture_id?: number
          home_logo?: string | null
          home_name?: string | null
          home_score?: number | null
          home_team_id?: number | null
          kickoff?: string
          league_id?: number | null
          league_logo?: string | null
          league_name?: string | null
          raw?: Json | null
          season?: number | null
          sport?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: number
          logo_url: string | null
          name: string
          sport: string
          updated_at: string
        }
        Insert: {
          id: number
          logo_url?: string | null
          name: string
          sport?: string
          updated_at?: string
        }
        Update: {
          id?: number
          logo_url?: string | null
          name?: string
          sport?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_leagues: {
        Row: {
          league_id: number
          season: number
          sport: string
          team_id: number
        }
        Insert: {
          league_id: number
          season: number
          sport?: string
          team_id: number
        }
        Update: {
          league_id?: number
          season?: number
          sport?: string
          team_id?: number
        }
        Relationships: []
      }
      active_leagues: {
        Row: {
          active: boolean
          country: string | null
          league_id: number
          logo_url: string | null
          name: string
          season: number
          sport: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          active?: boolean
          country?: string | null
          league_id: number
          logo_url?: string | null
          name: string
          season: number
          sport?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          active?: boolean
          country?: string | null
          league_id?: number
          logo_url?: string | null
          name?: string
          season?: number
          sport?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          job: string
          meta: Json
          ok: boolean
          requests: number
          settled: number
          sport: string
          started_at: string
          upserted: number
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job: string
          meta?: Json
          ok?: boolean
          requests?: number
          settled?: number
          sport?: string
          started_at?: string
          upserted?: number
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          meta?: Json
          ok?: boolean
          requests?: number
          settled?: number
          sport?: string
          started_at?: string
          upserted?: number
        }
        Relationships: []
      }
      pages: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          published: boolean
          seo_description: string | null
          seo_title: string | null
          show_in_footer: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          created_at: string
          id: string
          last_seen_at: string | null
          notify_settle: boolean
          role: string
          unit_size: number
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          id: string
          last_seen_at?: string | null
          notify_settle?: boolean
          role?: string
          unit_size?: number
          username: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          id?: string
          last_seen_at?: string | null
          notify_settle?: boolean
          role?: string
          unit_size?: number
          username?: string
        }
        Relationships: []
      }
      settle_queue: {
        Row: {
          bet_id: string
          created_at: string
          id: string
          reason: string
          resolved: boolean
        }
        Insert: {
          bet_id: string
          created_at?: string
          id?: string
          reason: string
          resolved?: boolean
        }
        Update: {
          bet_id?: string
          created_at?: string
          id?: string
          reason?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "settle_queue_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheets: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          slug: string
          start_bankroll: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          start_bankroll?: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          start_bankroll?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      banner_stats: {
        Row: {
          banner_id: string | null
          clicks: number | null
          ctr: number | null
          views: number | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          bets_count: number | null
          competition_id: string | null
          netto: number | null
          roi: number | null
          total_stake: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bet_type_family: { Args: { p_pick: string }; Returns: string }
      get_user_betting_profile: {
        Args: { p_user_id: string }
        Returns: {
          sport: string
          league_id: number | null
          league_name: string
          bet_type: string
          bets: number
          weighted_bets: number
          hitrate: number | null
          roi: number | null
          avg_odds: number | null
          last_bet_at: string | null
          established: boolean
        }[]
      }
      suggestion_candidate_users: {
        Args: { p_min_bets?: number }
        Returns: {
          user_id: string
          settled_bets: number
          dominant_sport: string
        }[]
      }
      get_bet_stats: {
        Args: {
          p_sheet_id: string
          p_from_date?: string | null
          p_to_date?: string | null
          p_unit_size?: number | null
        }
        Returns: Json
      }
      get_league_stats: {
        Args: {
          p_sheet_id: string
          p_from_date?: string | null
          p_to_date?: string | null
          p_limit?: number
        }
        Returns: Json
      }
      get_public_sheets_leaderboard: {
        Args: {
          p_limit?: number
          p_exclude_user_id?: string | null
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

/* Convenience aliases used across the app */
export type UserRole = "user" | "admin";
export type BetResult =
  | "open"
  | "win"
  | "loss"
  | "void"
  | "halfwin"
  | "halfloss";
export type BannerPlacement = "home" | "sheet" | "topplista" | "spelbolag";

export type Profile = Tables<"profiles">;
export type Sheet = Tables<"sheets">;
export type Fixture = Tables<"fixtures">;
export type Team = Tables<"teams">;
export type TeamLeague = Tables<"team_leagues">;
export type ActiveLeague = Tables<"active_leagues">;
export type SyncLog = Tables<"sync_log">;
export type Bookmaker = Tables<"bookmakers">;
export type Banner = Tables<"banners">;
export type Page = Tables<"pages">;
export type PushSubscriptionRow = Tables<"push_subscriptions">;
export type Competition = Tables<"competitions">;
export type CompetitionEntry = Tables<"competition_entries">;
export type AdminLog = Tables<"admin_logs">;
export type AffiliateClick = Tables<"affiliate_clicks">;
export type BannerEvent = Tables<"banner_events">;
export type AppSetting = Tables<"app_settings">;
export type SettleQueueItem = Tables<"settle_queue">;
export type LeaderboardRow = Tables<"leaderboard">;
export type BannerStats = Tables<"banner_stats">;
export type AiGenerationLog = Tables<"ai_generation_log">;

export type Bet = Omit<Tables<"bets">, "result" | "settled_by" | "payout"> & {
  result: BetResult;
  settled_by: "user" | "auto" | null;
  payout: number;
  bookmakers?: Pick<Bookmaker, "id" | "name" | "logo_url"> | null;
  fixtures?: Pick<
    Fixture,
    | "fixture_id"
    | "kickoff"
    | "status"
    | "elapsed"
    | "home_score"
    | "away_score"
    | "home_logo"
    | "away_logo"
    | "home_team_id"
    | "away_team_id"
    | "home_name"
    | "away_name"
    | "sport"
    | "league_id"
    | "league_logo"
    | "league_name"
  > | null;
};

export interface BetStats {
  bets: number;
  stake: number;
  payout: number;
  netto: number;
  roi: number;
  hitrate: number;
  avgOdds: number;
  avgStake: number;
  open: number;
}
