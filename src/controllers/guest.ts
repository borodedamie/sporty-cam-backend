import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { Guest } from "../models/player-application";
import logger from "../utils/logger";

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
    };

    if (payload.club_id) {
      logger.info("create guest - validating club_id", {
        club_id: payload.club_id,
      });
      const clubCheck = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("id", payload.club_id)
        .maybeSingle();

      if ((clubCheck as any).error) {
        logger.error(
          "create guest - error checking club:",
          (clubCheck as any).error
        );
        return res
          .status(500)
          .json({ status: "failed", message: "Failed to validate club_id" });
      }

      if (!(clubCheck as any).data) {
        logger.warn("create guest - club_id not found", {
          club_id: payload.club_id,
        });
        return res
          .status(400)
          .json({ status: "failed", message: "club_id does not exist" });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("player_applications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("Supabase insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

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
