export interface GuestFeePayment {
  id: string;
  created_at: string;
  payment_reference: string;
  payment_method: "paystack" | "kora" | string;
  amount: number;
  club_id: string;
  player_application_id: string;
}

export interface CreateGuestFeePaymentInput {
  payment_reference: string;
  payment_method: "paystack" | "kora";
  amount?: number;
  club_id: string;
  player_application_id: string;
}