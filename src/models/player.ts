export interface Player {
  id?: string;
  user_id: string;
  name?: string;
  email?: string;
  phone_number?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  address?: string | null;
  profile_picture_url?: string | null;
  preferred_jersey_name?: string | null;
  position?: string | null;
  hmo_provider?: string | null;
  genotype?: string | null;
  health_concerns?: string | null;
  emergency_contact_1_name?: string | null;
  emergency_contact_1_relationship?: string | null;
  emergency_contact_1_phone?: string | null;
  emergency_contact_2_name?: string | null;
  emergency_contact_2_relationship?: string | null;
  emergency_contact_2_phone?: string | null;
  social_media_handles?: Record<string, unknown> | null;
  bio?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  state?: string | null;
  city?: string | null;
  interested_in?: string[] | null;
  preferred_sport?: string | null;
  country?: string | null;
  identification?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ClubPlayer = Player & {
  club_id?: string;
  jersey_number?: number;
  is_captain?: boolean;
  is_available?: boolean;
  default_availability?: boolean | null;
};

/** @deprecated Prefer `Player` (players table row) or `ClubPlayer` (club-scoped). */
export type PlayerLegacy = ClubPlayer & {
  application_type?: string;
  status?: string;
  preferred_training_day?: string | null;
  time_preference?: string | null;
  referee_in_club?: string | boolean | null;
  payment_required?: boolean | null;
  payment_status?: string | null;
  stripe_session_id?: string | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  motivation_letter?: string | null;
  previous_club_experience?: string | null;
  approved_at?: string | null;
  profile_visibility?: string | null;
  notification_preferences?: Record<string, unknown> | null;
  passport_document_url?: string | null;
  profile_picture_url?: string | null;
  password_hash?: string | null;
  username?: string | null;
};
