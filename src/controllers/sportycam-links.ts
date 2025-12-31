import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";

const db = supabaseAdmin || supabase;

export const validateSportycamCode = async (req: Request, res: Response) => {
  try {
    const { rawEmail, code } = req.body || {};
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      return res.status(400).json({ status: "failed", message: "`email` string is required in body" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: "failed", message: "`email` must be a valid email address" });
    }

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        status: "failed",
        message: "`code` string is required in body",
      });
    }

    // 1️⃣ Find unused, unexpired code for this email
    const { data: link, error: linkErr } = await db
      .from("sportycam_links")
      .select("id, club_id, used, expires_at")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (linkErr) {
      logger.error("validateSportycamCode - query error:", linkErr);
      return res.status(400).json({
        status: "failed",
        message: linkErr.message,
      });
    }

    if (!link) {
      return res.status(404).json({
        status: "failed",
        message: "Invalid or expired code",
      });
    }

    // 2️⃣ Mark code as used
    const { error: updateErr } = await db
      .from("sportycam_links")
      .update({ used: true })
      .eq("id", link.id);

    if (updateErr) {
      logger.error("validateSportycamCode - update error:", updateErr);
      return res.status(500).json({
        status: "failed",
        message: "Failed to mark code as used",
      });
    }

    // 3️⃣ Fetch club info
    const { data: club, error: clubErr } = await db
      .from("clubs")
      .select("id, name")
      .eq("id", link.club_id)
      .maybeSingle();

    if (clubErr || !club) {
      logger.error("validateSportycamCode - club fetch error:", clubErr);
      return res.status(500).json({
        status: "failed",
        message: "Club lookup failed",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Code validated",
      data: {
        club,
        device_token: link.id,
      },
    });
  } catch (err: any) {
    logger.error("validateSportycamCode unexpected error:", err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export default validateSportycamCode;
