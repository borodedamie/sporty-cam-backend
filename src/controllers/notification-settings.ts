import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";
import { defaultNotificationSettings } from "../models/notification-settings";

const ALLOWED_FIELDS = [
  "email_notifications",
  "push_notifications",
  "new_training_sessions",
  "training_match_reminders",
  "club_announcements",
  "new_member_welcomes",
];

export const getMyNotificationSettings = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ status: "failed", message: "Unauthorized" });

  try {
    if (!supabaseAdmin) {
      return res
        .status(500)
        .json({
          status: "failed",
          message:
            "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
        });
    }

    const { data, error } = await supabaseAdmin
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && (error as any).code !== "PGRST116") {
      logger.error("getMyNotificationSettings error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    if (!data) {
      const defaults = defaultNotificationSettings(userId);
      const { data: created, error: createErr } = await supabaseAdmin
        .from("notification_settings")
        .insert(defaults)
        .select("*")
        .single();

      if (createErr) {
        logger.error(
          "getMyNotificationSettings create defaults error:",
          createErr
        );
        return res
          .status(400)
          .json({ status: "failed", message: createErr.message });
      }

      return res
        .status(200)
        .json({
          status: "success",
          message: "Notification settings created",
          data: created,
        });
    }

    return res
      .status(200)
      .json({
        status: "success",
        message: "Notification settings fetched",
        data,
      });
  } catch (err: any) {
    logger.error("getMyNotificationSettings unexpected error:", err);
    return res
      .status(500)
      .json({
        status: "failed",
        message: err.message || "Internal Server Error",
      });
  }
};

export const updateMyNotificationSettings = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;
  if (!userId)
    return res.status(401).json({ status: "failed", message: "Unauthorized" });

  try {
    if (!supabaseAdmin) {
      return res
        .status(500)
        .json({
          status: "failed",
          message:
            "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
        });
    }

    const payload: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        payload[key] = !!req.body[key];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res
        .status(400)
        .json({ status: "failed", message: "No valid fields provided" });
    }

    const upsertObj = { user_id: userId, ...payload };
    const { data, error } = await supabaseAdmin
      .from("notification_settings")
      .upsert(upsertObj, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      logger.error("updateMyNotificationSettings upsert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res
      .status(200)
      .json({
        status: "success",
        message: "Notification settings updated",
        data,
      });
  } catch (err: any) {
    logger.error("updateMyNotificationSettings unexpected error:", err);
    return res
      .status(500)
      .json({
        status: "failed",
        message: err.message || "Internal Server Error",
      });
  }
};
