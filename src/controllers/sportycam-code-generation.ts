import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { transporter } from "../utils/nodemailer";
import crypto from "crypto";
import logger from "../utils/logger";

const db = supabaseAdmin || supabase;

const generate6CharCode = (): string => {
  const length = 6;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
};

const sendOtpEmail = async (to: string, code: string, clubName?: string) => {
  const subject = "Your SportyCam access code";
  const text = `Your SportyCam verification code is: ${code}`;
  const html = `<div style="font-family:Arial,sans-serif;padding:20px"><h3>SportyCam verification code</h3><p>Your one-time code is <strong style="font-size:20px">${code}</strong>.</p>${clubName ? `<p>Club: ${clubName}</p>` : ""}<p>This code will expire shortly.</p></div>`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  } as any;

  return transporter.sendMail(mailOptions);
};

export const generateSportycamCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ status: "failed", message: "`email` string is required in body" });
    }

    // Check clubs table for this email (common admin fields)
    const { data: clubs, error: clubsErr } = await db
      .from("clubs")
      .select("id,name,super_admin_email,secretary_email")
      .or(`super_admin_email.eq.${email},secretary_email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (clubsErr) {
      logger.error("generateSportycamCode - clubs query error:", clubsErr);
      return res.status(400).json({ status: "failed", message: clubsErr.message });
    }

    if (!clubs) {
      return res.status(404).json({ status: "failed", message: "Email not associated with any club" });
    }

    // Check user exists in Supabase Auth
    if (!supabaseAdmin) {
      logger.error("generateSportycamCode - supabaseAdmin not configured");
      return res.status(500).json({ status: "failed", message: "Server configuration error" });
    }

    let authUserExists = false;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        logger.error("generateSportycamCode - auth error:", authError);
        return res.status(500).json({ status: "failed", message: "Failed to verify user" });
      }

      // Find user by email in the list
      const user = (authData?.users || []).find((u)=>u.email?.toLowerCase() === email);
      authUserExists = !!user;
      
      logger.info(`Auth check for ${email}: ${authUserExists ? 'found' : 'not found'}`);
      
    } catch (err: any) {
      logger.error("generateSportycamCode - auth check error:", err);
      return res.status(500).json({ status: "failed", message: "Failed to verify user" });
    }

    if (!authUserExists) {
      return res.status(404).json({ status: "failed", message: "User not found in auth" });
    }

    // Generate a unique 6-char code
    let attempts = 0;
    let code = "";
    while (attempts < 10) {
      code = generate6CharCode();
      const { data: existing, error: existingErr } = await db
        .from("sportycam_links")
        .select("code")
        .eq("code", code)
        .limit(1)
        .maybeSingle();
        
      if (existingErr && (existingErr as any).code !== "PGRST116") {
        logger.error("generateSportycamCode - checking existing code error:", existingErr);
        break;
      }
      if (!existing) break; // unique
      attempts += 1;
    }

    if (!code) {
      return res.status(500).json({ status: "failed", message: "Could not generate unique code" });
    }

    // insert into sportycam_links
    const insertPayload = {
      code,
      email,
      club_id: clubs.id,
    };

    const { data: inserted, error: insertErr } = await db
      .from("sportycam_links")
      .insert(insertPayload)
      .select()
      .maybeSingle();
      
    if (insertErr) {
      logger.error("generateSportycamCode - insert error:", insertErr);
      return res.status(400).json({ status: "failed", message: insertErr.message });
    }

    // Send email
    try {
      await sendOtpEmail(email, code, clubs.name);
    } catch (mailErr: any) {
      logger.error("generateSportycamCode - email send error:", mailErr);
      // attempt to cleanup inserted row
      try {
        await db.from("sportycam_links").delete().eq("code", code);
      } catch (dErr) {
        logger.warn("generateSportycamCode - failed to cleanup sportycam_links after email failure", dErr);
      }
      return res.status(500).json({ status: "failed", message: "Failed to send email" });
    }

    return res.status(200).json({ 
      status: "success", 
      message: "Code generated and emailed", 
      data: { 
        code: inserted?.code || code, 
        club: { 
          id: clubs.id, 
          name: clubs.name 
        } 
      } 
    });
  } catch (err: any) {
    logger.error("generateSportycamCode unexpected error:", err);
    return res.status(500).json({ status: "failed", message: err.message || "Internal Server Error" });
  }
};

export default generateSportycamCode;
