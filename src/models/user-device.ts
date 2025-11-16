export interface UserDevice {
  id?: string;
  user_id: string;
  provider: string;
  token: string;
  platform?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}
