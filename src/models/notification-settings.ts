export interface NotificationSettings {
  id?: string;
  user_id: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  new_training_sessions?: boolean;
  training_match_reminders?: boolean;
  club_announcements?: boolean;
  new_member_welcomes?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const defaultNotificationSettings = (
  user_id: string
): NotificationSettings => ({
  user_id,
  email_notifications: true,
  push_notifications: true,
  new_training_sessions: true,
  training_match_reminders: true,
  club_announcements: true,
  new_member_welcomes: true,
});
