export interface PlayerApplication {
  id: string;
  club_id?: string | null;
  application_type: string;
  status: string;
  full_name: string;
  email: string;
  preferred_training_day?: string | null;
  time_preference?: string | null;
  preferred_jersey_name?: string | null;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  interested_in?: string[];
  preferred_sport?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  position?: string | null;
  phone_number?: string | null;
  hmo_provider?: string | null;
  genotype?: string | null;
  health_concerns?: string | null;
  emergency_contact_1_name?: string | null;
  emergency_contact_1_relationship?: string | null;
  emergency_contact_1_phone?: string | null;
  emergency_contact_2_name?: string | null;
  emergency_contact_2_relationship?: string | null;
  emergency_contact_2_phone?: string | null;
  referee_in_club?: boolean | null;
  payment_required?: boolean | null;
  payment_status?: string | null;
  social_media_handles?: Record<string, string> | null;
  motivation_letter?: string | null;
  previous_club_experience?: string | null;
  profile_photo_url?: string | null;
  jersey_name?: string | null;
  profile_visibility?: string | null;
  default_availability?: any | null;
  bio?: string | null;
  passport_document_url?: string | null;
  profile_picture_url?: string | null;
  password_hash?: string | null;
  first_name?: string;
  last_name?: string;
  username?: string | null;
  user_id: string;
}

export interface Guest {
  application_type: PlayerApplication["application_type"];
  club_id?: PlayerApplication["club_id"];
  email: PlayerApplication["email"];
  full_name: PlayerApplication["full_name"];
  payment_required?: PlayerApplication["payment_required"];
  time_preference?: PlayerApplication["time_preference"];
}