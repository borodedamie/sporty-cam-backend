export interface HighlightRequest {
  id?: number;
  training_date: string;
  highlight_type?: string | null;
  special_requests?: string | null;
  highlight_id?: string | null;
  player_id: string;
  user_id: string;
  created_at?: string;
}
