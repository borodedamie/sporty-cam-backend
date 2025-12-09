import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { Guest } from "../models/player-application";
import logger from "../utils/logger";
import { transporter } from "../utils/nodemailer";
import { generateGuestAdminEmailHtml } from "../utils/emailTemplates";

export const createGuest = async (req: Request, res: Response) => {
  try {
    const body: Guest = req.body;

    if (!body.email || !body.full_name) {
      return res.status(400).json({
        status: "failed",
        message: "Email and full name are required",
      });
    }

    const payload: Guest = {
      application_type: "guest",
      club_id: body.club_id ?? null,
      email: body.email,
      full_name: body.full_name,
      payment_required: body.payment_required ?? null,
      time_preference: body.time_preference ?? null,
      // preferred_training_day: body.preferred_training_day ?? null,
    };

    if (payload.club_id) {
      logger.info("create guest - validating club_id", {
        club_id: payload.club_id,
      });
    }
    // const clubCheck = await supabaseAdmin
    //   .from("clubs")
    //   .select("id")
    //   .eq("id", payload.club_id)
    //   .maybeSingle();

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("*")
      .eq("id", payload.club_id)
      .maybeSingle();

    if (clubError) {
      logger.error("create guest - error checking club:", clubError);

      return res
        .status(500)
        .json({ status: "failed", message: "Failed to validate club_id" });
    }

    if (!club) {
      logger.warn("create guest - club_id not found", {
        club_id: payload.club_id,
      });
      return res
        .status(400)
        .json({ status: "failed", message: "club_id does not exist" });
    }

    //  ----------- CTA: chekcs if "allows_guests": true && "requires_payment": true -------------
    const { data, error } = await supabaseAdmin
      .from("player_applications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("Supabase insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    // ------------- Email to Club Host -------------

    // change email to club's email
    const clubMailOptions = {
      from: `Sporty cam Support <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject:
        "Guest Payment Received – Guest Player Cleared for Today’s Session",
      html: generateGuestAdminEmailHtml(
        club.name,
        data.full_name,
        data.email,
        club?.guest_fee,
        data.time_preference,
        data.preferred_training_day
      ),
    };

    transporter.sendMail(clubMailOptions, (error: any, info: any) => {
      if (error)
        logger.error(
          "Error sending club email:",
          (error as any).message || error
        );
      else logger.info("Club email sent:", info.response);
    });
    // ------------- Email to Guest Applicant -------------

    const guestMailOptions = {
      from: `Sporty cam Support <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `Payment Successful – You Are Cleared to Play with ${club.name}`,
      html: generateGuestAdminEmailHtml(
        club.name,
        data.full_name,
        data.email,
        club?.guest_fee,
        data.time_preference,
        data.preferred_training_day
      ),
    };

    transporter.sendMail(guestMailOptions, (error: any, info: any) => {
      if (error)
        logger.error(
          "Error sending guest email:",
          (error as any).message || error
        );
      else logger.info("Guest email sent:", info.response);
    });
    return res
      .status(201)
      .json({ status: "success", message: "Guest application created", data });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};
