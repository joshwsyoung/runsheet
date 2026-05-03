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
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          owner_id: string;
          timezone?: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          owner_id?: string;
          timezone?: string;
          created_at?: string;
          archived_at?: string | null;
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
        };
        Insert: {
          id?: string;
          runsheet_id: string;
          day_date: string;
          label?: string | null;
          is_special?: boolean;
        };
        Update: {
          id?: string;
          runsheet_id?: string;
          day_date?: string;
          label?: string | null;
          is_special?: boolean;
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
