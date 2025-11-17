import { Request, Response } from "express";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";
import { emitNotificationRead } from "../lib/socket";

export async function getMyNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ status: "failed", message: "Unauthorized" });

    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt((req.query.pageSize as string) || "25", 10), 1),
      100
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const query = supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) {
      logger.error("getMyNotifications error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Notifications fetched successfully",
      data: {
        notifications: data || [],
        page,
        pageSize,
        total: count ?? (data ? data.length : 0),
        totalPages: count ? Math.ceil(count / pageSize) : 1,
      },
    });
  } catch (err: any) {
    logger.error("getMyNotifications unexpected error:", err);
    return res
      .status(500)
      .json({
        status: "failed",
        message: err.message || "Internal Server Error",
      });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const id = req.params.id;
    if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, last_attempt_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("markNotificationRead error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    const updated = data || null;

    try {
      if (updated) {
        emitNotificationRead(userId, { id: updated.id, notification: updated });
      }
    } catch (e) {
      logger.error("emitNotificationRead failed in markNotificationRead:", e);
    }

    return res.json({ ok: true, data: updated });
  } catch (err: any) {
    logger.error("markNotificationRead unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const id = req.params.id;
    if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("deleteNotification error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    const deleted = data || null;

    return res.json({ ok: true, data: deleted });
  } catch (err: any) {
    logger.error("deleteNotification unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
}

export async function deleteAllNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .select();

    if (error) {
      logger.error("deleteAllNotifications error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;

    return res.json({ ok: true, deleted: deletedCount, data: data || [] });
  } catch (err: any) {
    logger.error("deleteAllNotifications unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
}
