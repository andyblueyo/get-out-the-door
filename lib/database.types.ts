// Hand-written against the live schema documented in CLAUDE.md (the Supabase
// CLI isn't installed here). To regenerate properly:
//   supabase gen types typescript --project-id htctfxlrskdztpirylez

import type { Answers, RoutineGraph, TicketItem } from './routine/types'
import type { StoredWeather } from './weather'
import type { TrackedLine } from './subway/types'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LocationMode = 'auto' | 'manual'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          location_mode: LocationMode
          manual_place: string | null
          latitude: number | null
          longitude: number | null
          subway_enabled: boolean
          subway_show_walk: boolean
          subway_show_leave_by: boolean
          subway_stop_id: string | null
          subway_stop_name: string | null
          subway_lines: TrackedLine[]
          created_at: string
          updated_at: string
        }
        // No client INSERT policy — rows come from the on_auth_user_created trigger.
        Insert: never
        Update: {
          display_name?: string | null
          location_mode?: LocationMode
          manual_place?: string | null
          latitude?: number | null
          longitude?: number | null
          subway_enabled?: boolean
          subway_show_walk?: boolean
          subway_show_leave_by?: boolean
          subway_stop_id?: string | null
          subway_stop_name?: string | null
          subway_lines?: TrackedLine[]
          updated_at?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          graph: RoutineGraph
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          graph?: RoutineGraph
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          graph?: RoutineGraph
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      daily_state: {
        Row: {
          user_id: string
          routine_id: string | null
          local_date: string
          generated_at: string
          items: TicketItem[]
          answers: Answers
          weather: StoredWeather | null
          completed_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          routine_id?: string | null
          local_date: string
          generated_at?: string
          items?: TicketItem[]
          answers?: Answers
          weather?: StoredWeather | null
          completed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          routine_id?: string | null
          local_date?: string
          generated_at?: string
          items?: TicketItem[]
          answers?: Answers
          weather?: StoredWeather | null
          completed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
