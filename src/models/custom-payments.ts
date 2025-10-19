export type CustomPaymentStatus =
  | "pending"
  | "confirmed"
  | "overdue"
  | "rejected";

export interface CustomPayment {
  id: number;
  club_id: string;
  player_application_id: string;
  fee_id: string;
  fee_name: string;
  amount_due: number;
  amount_paid: number | null;
  status: CustomPaymentStatus;
  due_date: string | null;
  receipt_url: string | null;
  payment_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  admin_confirmed_at: string | null;
  admin_confirmed_by: string | null;
  payment_method: string | null;
}

export interface CreateCustomPaymentInput {
  club_id: string;
  player_application_id: string;
  fee_id?: string;
  fee_name: string;
  amount_due: number;
  amount_paid?: number | null;
  status?: CustomPaymentStatus;
  due_date?: string | null;
  receipt_url?: string | null;
  payment_notes?: string | null;
  admin_notes?: string | null;
  payment_method?: string | null;
}

export interface UpdateCustomPaymentInput {
  fee_name?: string;
  amount_due?: number;
  amount_paid?: number | null;
  status?: CustomPaymentStatus;
  due_date?: string | null;
  receipt_url?: string | null;
  payment_notes?: string | null;
  admin_notes?: string | null;
  admin_confirmed_at?: string | null;
  admin_confirmed_by?: string | null;
  payment_method?: string | null;
}
