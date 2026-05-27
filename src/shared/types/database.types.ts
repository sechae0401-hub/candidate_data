export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      classification_results: {
        Row: {
          competing_course: string | null;
          created_at: string;
          detail_tags: string | null;
          id: string;
          needs_review: boolean;
          primary_cause: string | null;
          reasoning: string | null;
          review_completed: boolean;
          row_index: number;
          secondary_action: string | null;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          competing_course?: string | null;
          created_at?: string;
          detail_tags?: string | null;
          id?: string;
          needs_review?: boolean;
          primary_cause?: string | null;
          reasoning?: string | null;
          review_completed?: boolean;
          row_index: number;
          secondary_action?: string | null;
          session_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classification_results"]["Insert"]>;
      };
      new_categories: {
        Row: {
          category_name: string;
          created_at: string;
          id: string;
          occurrence_count: number;
          session_id: string;
        };
        Insert: {
          category_name: string;
          created_at?: string;
          id?: string;
          occurrence_count?: number;
          session_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["new_categories"]["Insert"]>;
      };
      sessions: {
        Row: {
          analyzed_at: string | null;
          cohort_name: string | null;
          created_at: string;
          excluded_rows: number;
          id: string;
          insight_summary: string | null;
          selected_result_values: string[];
          status: string;
          total_rows: number;
          updated_at: string;
        };
        Insert: {
          analyzed_at?: string | null;
          cohort_name?: string | null;
          created_at?: string;
          excluded_rows?: number;
          id?: string;
          insight_summary?: string | null;
          selected_result_values?: string[];
          status?: string;
          total_rows?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
