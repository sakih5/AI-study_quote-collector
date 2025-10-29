export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          icon: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          icon: string;
          display_order: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          icon?: string;
          display_order?: number;
          created_at?: string;
        };
      };
      books: {
        Row: {
          id: number;
          user_id: string;
          title: string;
          author: string;
          cover_image_url: string | null;
          isbn: string | null;
          asin: string | null;
          publisher: string | null;
          publication_date: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          title: string;
          author: string;
          cover_image_url?: string | null;
          isbn?: string | null;
          asin?: string | null;
          publisher?: string | null;
          publication_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          title?: string;
          author?: string;
          cover_image_url?: string | null;
          isbn?: string | null;
          asin?: string | null;
          publisher?: string | null;
          publication_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      sns_users: {
        Row: {
          id: number;
          user_id: string;
          platform: 'X' | 'THREADS';
          handle: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          platform: 'X' | 'THREADS';
          handle: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          platform?: 'X' | 'THREADS';
          handle?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      tags: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      quotes: {
        Row: {
          id: number;
          user_id: string;
          text: string;
          source_type: 'BOOK' | 'SNS' | 'OTHER';
          book_id: number | null;
          sns_user_id: number | null;
          page_number: number | null;
          source_meta: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          text: string;
          source_type: 'BOOK' | 'SNS' | 'OTHER';
          book_id?: number | null;
          sns_user_id?: number | null;
          page_number?: number | null;
          source_meta?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          text?: string;
          source_type?: 'BOOK' | 'SNS' | 'OTHER';
          book_id?: number | null;
          sns_user_id?: number | null;
          page_number?: number | null;
          source_meta?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      quote_activities: {
        Row: {
          id: number;
          quote_id: number;
          activity_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          quote_id: number;
          activity_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          quote_id?: number;
          activity_id?: number;
          created_at?: string;
        };
      };
      quote_tags: {
        Row: {
          id: number;
          quote_id: number;
          tag_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          quote_id: number;
          tag_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          quote_id?: number;
          tag_id?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      quotes_with_details: {
        Row: {
          id: number;
          user_id: string;
          text: string;
          source_type: 'BOOK' | 'SNS' | 'OTHER';
          page_number: number | null;
          source_meta: Json | null;
          created_at: string;
          updated_at: string;
          book_id: number | null;
          book_title: string | null;
          book_author: string | null;
          book_cover_image_url: string | null;
          sns_user_id: number | null;
          sns_platform: 'X' | 'THREADS' | null;
          sns_handle: string | null;
          sns_display_name: string | null;
          activity_ids: number[] | null;
          activity_names: string[] | null;
          tag_ids: number[] | null;
          tag_names: string[] | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
