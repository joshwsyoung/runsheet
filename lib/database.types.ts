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
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      runsheets: {
        Row: {
          id: string;
          title: string;
          owner_id: string;
          timezone: string;
          /** Inclusive trip first day YYYY-MM-DD */
          start_date: string;
          /** Inclusive trip last day YYYY-MM-DD */
          end_date: string;
          created_at: string;
          archived_at: string | null;
          hero_image_url: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          owner_id: string;
          timezone?: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          archived_at?: string | null;
          hero_image_url?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          owner_id?: string;
          timezone?: string;
          start_date?: string;
          end_date?: string;
          created_at?: string;
          archived_at?: string | null;
          hero_image_url?: string | null;
        };
        Relationships: [];
      };
      runsheet_members: {
        Row: {
          runsheet_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          runsheet_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          runsheet_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      runsheet_invites: {
        Row: {
          id: string;
          runsheet_id: string;
          email: string;
          role: string;
          token: string;
          invited_by: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          runsheet_id: string;
          email: string;
          role?: string;
          token: string;
          invited_by: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          runsheet_id?: string;
          email?: string;
          role?: string;
          token?: string;
          invited_by?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      runsheet_days: {
        Row: {
          id: string;
          runsheet_id: string;
          day_date: string;
          label: string | null;
          is_special: boolean;
          /** 'travel' | 'work' | 'leave' | 'free' — see lib/day-status.ts */
          status: string;
        };
        Insert: {
          id?: string;
          runsheet_id: string;
          day_date: string;
          label?: string | null;
          is_special?: boolean;
          status?: string;
        };
        Update: {
          id?: string;
          runsheet_id?: string;
          day_date?: string;
          label?: string | null;
          is_special?: boolean;
          status?: string;
        };
        Relationships: [];
      };
      trip_ideas: {
        Row: {
          id: string;
          runsheet_id: string;
          category: string;
          text: string;
          note: string | null;
          place: string | null;
          image_url: string | null;
          /** Name was unclear at capture — shown with a badge, never silently cleaned up. */
          unconfirmed: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          runsheet_id: string;
          category?: string;
          text: string;
          note?: string | null;
          place?: string | null;
          image_url?: string | null;
          unconfirmed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          runsheet_id?: string;
          category?: string;
          text?: string;
          note?: string | null;
          place?: string | null;
          image_url?: string | null;
          unconfirmed?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      slots: {
        Row: {
          id: string;
          day_id: string;
          start_at: string;
          end_at: string;
          activity_type: string;
          title: string | null;
          description: string | null;
          description_bullets: Json;
          todos: Json;
          from_location: string | null;
          to_location: string | null;
          from_lat: number | null;
          from_lng: number | null;
          to_lat: number | null;
          to_lng: number | null;
          location_lat: number | null;
          location_lng: number | null;
          flight_number: string | null;
          location_name: string | null;
          map_url: string | null;
          link_url: string | null;
          preview_title: string | null;
          preview_description: string | null;
          preview_image_url: string | null;
          preview_fetched_at: string | null;
          booking_ref: string | null;
          contact_info: string | null;
          open_ended: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          flight_meta: Json | null;
          attachment_urls: Json | null;
        };
        Insert: {
          id?: string;
          day_id: string;
          start_at: string;
          end_at: string;
          activity_type?: string;
          title?: string | null;
          description?: string | null;
          description_bullets?: Json;
          todos?: Json;
          from_location?: string | null;
          to_location?: string | null;
          from_lat?: number | null;
          from_lng?: number | null;
          to_lat?: number | null;
          to_lng?: number | null;
          location_lat?: number | null;
          location_lng?: number | null;
          flight_number?: string | null;
          location_name?: string | null;
          map_url?: string | null;
          link_url?: string | null;
          preview_title?: string | null;
          preview_description?: string | null;
          preview_image_url?: string | null;
          preview_fetched_at?: string | null;
          booking_ref?: string | null;
          contact_info?: string | null;
          open_ended?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          flight_meta?: Json | null;
          attachment_urls?: Json | null;
        };
        Update: {
          id?: string;
          day_id?: string;
          start_at?: string;
          end_at?: string;
          activity_type?: string;
          title?: string | null;
          description?: string | null;
          description_bullets?: Json;
          todos?: Json;
          from_location?: string | null;
          to_location?: string | null;
          from_lat?: number | null;
          from_lng?: number | null;
          to_lat?: number | null;
          to_lng?: number | null;
          location_lat?: number | null;
          location_lng?: number | null;
          flight_number?: string | null;
          location_name?: string | null;
          map_url?: string | null;
          link_url?: string | null;
          preview_title?: string | null;
          preview_description?: string | null;
          preview_image_url?: string | null;
          preview_fetched_at?: string | null;
          booking_ref?: string | null;
          contact_info?: string | null;
          open_ended?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          flight_meta?: Json | null;
          attachment_urls?: Json | null;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          day_id: string;
          label: string;
          done: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          day_id: string;
          label: string;
          done?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          day_id?: string;
          label?: string;
          done?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_runsheet: {
        Args: { p_title: string; p_timezone?: string };
        Returns: string;
      };
      accept_runsheet_invite: {
        Args: { invite_token: string };
        Returns: undefined;
      };
      peek_invite: {
        Args: { invite_token: string };
        Returns: {
          runsheet_id: string;
          title: string;
          email: string;
          accepted: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
