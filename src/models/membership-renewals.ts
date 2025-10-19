export type MembershipRenewalStatus = "pending" | "confirmed" | "overdue" | "rejected";

export interface MembershipRenewal {
  id: string;
  membership_period_id: string | null;
  player_application_id: string;
  club_id: string;
  due_date: string;
  amount_due: number;
  receipt_url: string | null;
  admin_confirmed_at: string | null;
  admin_notes: string | null;
  status: MembershipRenewalStatus;
  created_at: string;
  updated_at: string;
  payment_amount: number | null;
  season_name: string | null;
  season_start_date: string | null;
  season_end_date: string | null;
  auto_approved: boolean | null;
}

export interface CreateMembershipRenewalInput {
  membership_period_id?: string | null;
  club_id: string;
  due_date: string;
  amount_due: number;
  receipt_url?: string | null;
  admin_notes?: string | null;
  payment_amount?: number | null;
  season_name?: string | null;
  season_start_date?: string | null;
  season_end_date?: string | null;
  auto_approved?: boolean | null;
  payment_method?: "paystack" | "kora";
  reference?: string;
}