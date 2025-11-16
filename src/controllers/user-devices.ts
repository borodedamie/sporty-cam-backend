import { Request, Response } from "express";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id)
      return res.status(401).json({ ok: false, message: "unauthenticated" });

    const { token, provider = "fcm", platform, metadata } = req.body || {};
    if (!token || typeof token !== "string") {
      return res.status(400).json({ ok: false, message: "token is required" });
    }

    const payload: any = {
      user_id: user.id,
      token,
      provider,
    };
    if (platform) payload.platform = platform;
    if (metadata) payload.metadata = metadata;

    const { data, error } = await supabaseAdmin
      .from("user_devices")
      .upsert([payload], { onConflict: "token" });

    if (error) {
      logger.error("user-devices upsert error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    return res
      .status(200)
      .json({ ok: true, device: data && data[0] ? data[0] : null });
  } catch (err: any) {
    logger.error("registerDevice error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
};

export const listDevices = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id)
      return res.status(401).json({ ok: false, message: "unauthenticated" });

    const { data, error } = await supabaseAdmin
      .from("user_devices")
      .select("id,user_id,provider,token,platform,metadata,created_at")
      .eq("user_id", user.id);

    if (error) {
      logger.error("listDevices error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    return res.status(200).json({ ok: true, devices: data || [] });
  } catch (err: any) {
    logger.error("listDevices error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
};

export const unregisterDevice = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.id)
      return res.status(401).json({ ok: false, message: "unauthenticated" });

    const token = req.body?.token || req.query?.token;
    if (!token || typeof token !== "string")
      return res.status(400).json({ ok: false, message: "token is required" });

    const { error } = await supabaseAdmin
      .from("user_devices")
      .delete()
      .eq("token", token)
      .eq("user_id", user.id);

    if (error) {
      logger.error("unregisterDevice error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error("unregisterDevice error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
};
