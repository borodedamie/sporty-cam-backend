export interface Notification {
  id?: string;
  user_id?: string;
  club_id?: string | null;
  external_source?: string | null;
  external_id?: string | null;
  event_type: string;
  channel: 'email' | 'push' | 'in_app';
  payload?: Record<string, unknown> | null;
  status?: 'pending' | 'in_progress' | 'sent' | 'failed';
  attempt_count?: number;
  scheduled_at?: string | null;
  is_read?: boolean;
  last_attempt_at?: string | null;
  error_text?: string | null;
  created_at?: string;
}
