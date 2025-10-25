import { Request, Response } from "express";
import axios from "axios";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";
import {
  CreateCustomPaymentInput,
  CustomPaymentStatus,
} from "../models/custom-payments";
import {
  CreateMembershipRenewalInput,
  MembershipRenewalStatus,
} from "../models/membership-renewals";
import { CreateGuestFeePaymentInput } from "../models/guest-fee-payments";

type CreatePaymentBody = CreateCustomPaymentInput;

async function getClubInfo(clubId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("clubs")
      .select("id, name, sport")
      .eq("id", clubId)
      .single();

    if (error) {
      logger.warn("Could not fetch club info:", error);
      return { name: null as string | null, sport: null as string | null };
    }
    return {
      name: (data as any)?.name ?? null,
      sport: (data as any)?.sport ?? null,
    };
  } catch (e: any) {
    logger.error("getClubInfo error:", e?.message || e);
    return { name: null as string | null, sport: null as string | null };
  }
}

async function verifyPayment(reference: string) {
  try {
    const response = await axios({
      method: "get",
      url: `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    return response.data;
  } catch (error) {
    logger.error("Error verifying payment:", (error as any)?.message || error);
    throw error;
  }
}

function generateFeeId(feeName: string) {
  const base = (feeName || "").trim().replace(/\s+/g, "_");
  const rand6 = Math.floor(100000 + Math.random() * 900000).toString();
  return `${base}_${rand6}`;
}

function resolveFeeId(fee_name: string, fee_id?: string) {
  return (fee_id ?? "").trim() || generateFeeId(fee_name);
}

async function getLatestPlayerApplicationId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("player_applications")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data?.id as string | undefined;
}

async function computePaymentState(opts: {
  method?: string | null;
  fee_id?: string | null;
  amount_due: number;
  amount_paid_input?: number | null;
}) {
  let amount_paid: number | null = null;
  let status: CustomPaymentStatus = "pending";
  let payment_method: string | null = opts.method?.toLowerCase() || null;

  if (payment_method === "kora") {
    amount_paid = opts.amount_paid_input ?? opts.amount_due;
    status = "confirmed";
    return { amount_paid, status, payment_method: "kora" };
  }

  if (payment_method === "paystack" || opts.fee_id) {
    try {
      const verifyResp = await verifyPayment(String(opts.fee_id));
      const v = verifyResp?.data;
      if (v?.status === "success") {
        amount_paid =
          typeof v.amount === "number"
            ? v.amount / 100
            : opts.amount_paid_input ?? null;
        status = "confirmed";
        payment_method = v.channel || "paystack";
      } else {
        logger.warn(
          `Paystack verification not successful for ref ${opts.fee_id}`
        );
      }
    } catch (e: any) {
      logger.error("Paystack verification error:", e?.message || e);
    }
    return {
      amount_paid: amount_paid ?? opts.amount_paid_input ?? null,
      status,
      payment_method,
    };
  }

  return {
    amount_paid: opts.amount_paid_input ?? null,
    status,
    payment_method,
  };
}

async function computeRenewalState(opts: {
  method?: string;
  reference?: string;
  amount_due: number;
  payment_amount_input?: number | null;
}): Promise<{
  status: MembershipRenewalStatus;
  payment_amount: number | null;
}> {
  const method = (opts.method || "").toLowerCase();

  if (method === "kora") {
    return {
      status: "pending",
      payment_amount: opts.payment_amount_input ?? null,
    };
  }

  if (method === "paystack") {
    if (!opts.reference) {
      return {
        status: "pending",
        payment_amount: opts.payment_amount_input ?? null,
      };
    }
    try {
      const result = await verifyPayment(opts.reference);
      const v = result?.data;
      if (v?.status === "success") {
        const paid =
          typeof v.amount === "number"
            ? v.amount / 100
            : opts.payment_amount_input ?? null;
        return { status: "confirmed", payment_amount: paid };
      }
      logger.warn(
        `Paystack verification not successful for ref ${opts.reference}`
      );
    } catch (e: any) {
      logger.error("Paystack verification error:", e?.message || e);
    }
    return {
      status: "pending",
      payment_amount: opts.payment_amount_input ?? null,
    };
  }

  return {
    status: "pending",
    payment_amount: opts.payment_amount_input ?? null,
  };
}

export const createCustomPayment = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id ?? (req.user as any)?.sub;
  if (!userId) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: user not authenticated",
    });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const {
      club_id,
      fee_name,
      amount_due,
      amount_paid,
      due_date,
      receipt_url,
      payment_notes,
      admin_notes,
      payment_method,
      fee_id,
    } = req.body as CreatePaymentBody;

    if (!club_id || !fee_name || typeof amount_due !== "number") {
      return res.status(400).json({
        status: "failed",
        message: "club_id, fee_name and amount_due are required",
      });
    }

    const playerApplicationId = await getLatestPlayerApplicationId(userId);
    if (!playerApplicationId) {
      return res.status(404).json({
        status: "failed",
        message: "No player application found for this user",
      });
    }

    const computed = await computePaymentState({
      method: payment_method,
      fee_id,
      amount_due,
      amount_paid_input: amount_paid ?? null,
    });

    const payload = {
      club_id,
      player_application_id: playerApplicationId,
      fee_id: resolveFeeId(fee_name, fee_id),
      fee_name,
      amount_due,
      amount_paid: computed.amount_paid,
      status: computed.status,
      due_date: due_date ?? null,
      receipt_url: receipt_url ?? null,
      payment_notes: payment_notes ?? null,
      admin_notes: admin_notes ?? null,
      payment_method: computed.payment_method ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("custom_fee_payments")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      logger.error("custom_fee_payments insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(201).json({
      status: "success",
      message: "Payment created",
      data,
    });
  } catch (error: any) {
    logger.error("createCustomPayment error:", error?.message || error);
    return res.status(500).json({
      status: "failed",
      message: error?.message || "Internal Server Error",
    });
  }
};

export const getKoraCheckoutConfig = async (_req: Request, res: Response) => {
  try {
    const reference = randomUUID();

    return res.status(200).json({
      status: "success",
      data: {
        publicKey: process.env.KORA_PUBLIC_KEY,
        secretKey: process.env.KORA_SECRET_KEY,
        encryptionKey: process.env.KORA_ENCRYPTION_KEY,
        reference,
      },
    });
  } catch (error: any) {
    logger.error("getKoraCheckoutConfig error:", error?.message || error);
    return res.status(500).json({
      status: "failed",
      message: error?.message || "Internal Server Error",
    });
  }
};

export const createMembershipRenewal = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id ?? (req.user as any)?.sub;
  if (!userId) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: user not authenticated",
    });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const {
      membership_period_id,
      club_id,
      due_date,
      amount_due,
      receipt_url,
      admin_notes,
      payment_amount,
      season_name,
      season_start_date,
      season_end_date,
      auto_approved,
      payment_method,
      reference,
    } = req.body as CreateMembershipRenewalInput;

    if (!club_id || !due_date || typeof amount_due !== "number") {
      return res.status(400).json({
        status: "failed",
        message: "club_id, due_date and amount_due are required",
      });
    }

    if ((payment_method || "").toLowerCase() === "kora" && !reference) {
      return res.status(400).json({
        status: "failed",
        message: "reference is required for Kora payments",
      });
    }

    const player_application_id = await getLatestPlayerApplicationId(userId);
    if (!player_application_id) {
      return res.status(404).json({
        status: "failed",
        message: "No player application found for this user",
      });
    }

    const computed = await computeRenewalState({
      method: payment_method,
      reference,
      amount_due,
      payment_amount_input: payment_amount ?? null,
    });

    const payload = {
      membership_period_id: membership_period_id ?? null,
      player_application_id,
      club_id,
      due_date,
      amount_due,
      receipt_url: receipt_url ?? null,
      admin_confirmed_at: null,
      admin_notes: admin_notes ?? null,
      status: computed.status,
      payment_amount: computed.payment_amount,
      season_name: season_name ?? null,
      season_start_date: season_start_date ?? null,
      season_end_date: season_end_date ?? null,
      auto_approved: typeof auto_approved === "boolean" ? auto_approved : null,
    };

    const { data, error } = await supabaseAdmin
      .from("membership_renewals")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      logger.error("membership_renewals insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(201).json({
      status: "success",
      message: "Membership renewal created",
      data,
    });
  } catch (error: any) {
    logger.error("createMembershipRenewal error:", error?.message || error);
    return res.status(500).json({
      status: "failed",
      message: error?.message || "Internal Server Error",
    });
  }
};

export const createGuestFeePayment = async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const {
      payment_reference,
      payment_method,
      amount,
      club_id,
      player_application_id,
    } = req.body as CreateGuestFeePaymentInput;

    if (
      !payment_reference ||
      !payment_method ||
      !club_id ||
      !player_application_id
    ) {
      return res.status(400).json({
        status: "failed",
        message:
          "payment_reference, payment_method, club_id and player_application_id are required",
      });
    }

    const method = payment_method.toLowerCase();

    let finalAmount: number | null = null;

    if (method === "paystack") {
      try {
        const verify = await verifyPayment(payment_reference);
        const v = verify?.data;
        if (v?.status !== "success") {
          return res.status(400).json({
            status: "failed",
            message: "Paystack verification failed",
          });
        }
        finalAmount = typeof v.amount === "number" ? v.amount / 100 : null;
        if (finalAmount === null) {
          return res.status(400).json({
            status: "failed",
            message: "Unable to resolve verified amount from Paystack",
          });
        }
      } catch (e: any) {
        logger.error("Paystack verification error:", e?.message || e);
        return res.status(400).json({
          status: "failed",
          message: "Paystack verification error",
        });
      }
    } else if (method === "kora") {
      if (typeof amount !== "number" || !(amount > 0)) {
        return res.status(400).json({
          status: "failed",
          message: "amount must be provided and > 0 for Kora payments",
        });
      }
      finalAmount = amount;
    } else {
      return res.status(400).json({
        status: "failed",
        message: "Unsupported payment_method. Use 'paystack' or 'kora'.",
      });
    }

    const payload = {
      payment_reference,
      payment_method: method,
      amount: finalAmount,
      club_id,
      player_application_id,
    };

    const { data, error } = await supabaseAdmin
      .from("guest_fee_payments")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      logger.error("guest_fee_payments insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(201).json({
      status: "success",
      message: "Guest fee payment recorded",
      data,
    });
  } catch (error: any) {
    logger.error("createGuestFeePayment error:", error?.message || error);
    return res.status(500).json({
      status: "failed",
      message: error?.message || "Internal Server Error",
    });
  }
};

export const getPaymentsByClubAndCategory = async (
  req: Request,
  res: Response
) => {
  const club_id = (req.query.club_id as string) ?? null;
  const category = ((req.query.category as string) ?? "all").toLowerCase();

  const userId = (req.user as any)?.id ?? (req.user as any)?.sub;
  if (!userId) {
    return res
      .status(401)
      .json({ status: "failed", message: "Unauthorized: user not authenticated" });
  }

  if (!club_id) {
    return res
      .status(400)
      .json({ status: "failed", message: "club_id is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const playerApplicationId = await getLatestPlayerApplicationId(userId);
    if (!playerApplicationId) {
      return res.status(404).json({
        status: "failed",
        message: "No player application found for this user",
      });
    }

    const clubInfo = await getClubInfo(club_id);

    const results: any[] = [];

    const pushMapped = (rows: any[], source: string) => {
      for (const r of rows || []) {
        const createdAt = r.created_at ? new Date(r.created_at) : null;
        const payment_date = createdAt
          ? createdAt.toISOString().slice(0, 10)
          : null;
        const payment_time = createdAt
          ? createdAt.toISOString().slice(11, 19)
          : null;

        results.push({
          source,
          id: r.id,
          player_application_id: r.player_application_id ?? r.player_id ?? null,
          fee_id: r.fee_id ?? null,
          fee_name: r.fee_name ?? null,
          payment_reference: r.reference ?? r.payment_reference ?? null,
          payment_method: r.payment_method ?? null,
          amount_due: r.amount_due ?? r.amount ?? null,
          amount_paid: r.amount_paid ?? r.payment_amount ?? null,
          status: r.status ?? null,
          receipt_url: r.receipt_url ?? null,
          admin_notes: r.admin_notes ?? null,
          created_at: r.created_at ?? null,
          payment_date,
          payment_time,
          club_name: clubInfo.name,
          sport: clubInfo.sport,
        });
      }
    };

    if (category === "membership_renewal" || category === "all") {
      const { data, error } = await supabaseAdmin
        .from("membership_renewals")
        .select("*")
        .eq("club_id", club_id)
        .eq("player_application_id", playerApplicationId)
        .order("created_at", { ascending: false });
      if (error) logger.warn("membership_renewals fetch error:", error);
      pushMapped(data ?? [], "membership_renewal");
    }

    if (category === "custom_fee" || category === "all") {
      const { data, error } = await supabaseAdmin
        .from("custom_fee_payments")
        .select("*")
        .eq("club_id", club_id)
        .eq("player_application_id", playerApplicationId)
        .order("created_at", { ascending: false });
      if (error) logger.warn("custom_fee_payments fetch error:", error);
      pushMapped(data ?? [], "custom_fee");
    }

    return res.status(200).json({
      status: "success",
      message: "Payments fetched",
      data: results,
    });
  } catch (err: any) {
    logger.error("getPaymentsByClubAndCategory error:", err?.message || err);
    return res.status(500).json({
      status: "failed",
      message: err?.message || "Internal Server Error",
    });
  }
};
