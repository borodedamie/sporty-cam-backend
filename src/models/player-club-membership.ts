export type MembershipStatus = "active" | "inactive" | "suspended" | "archived";
export type MembershipType = "regular" | "guest" | "honorary" | "trial";

export interface PlayerClubMembership {
  id?: string;
  player_application_id: string;
  club_id: string;
  status: MembershipStatus;
  joined_at?: string | null;
  left_at?: string | null;
  membership_type: MembershipType;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
}

export interface CreatePlayerClubMembershipInput {
  player_application_id: string;
  club_id: string;
  status?: MembershipStatus;
  joined_at?: string | null;
  left_at?: string | null;
  membership_type?: MembershipType;
  notes?: string | null;
  created_by?: string | null;
}
