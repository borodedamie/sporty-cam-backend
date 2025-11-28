import { Request, Response } from "express";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";
import { sendInAppNotification, getRoomRecipientCount } from "../lib/socket";
import { sendPushToToken } from "../lib/push";
import { transporter } from "../utils/nodemailer";

export const handleClubEventsWebhook = async (req: Request, res: Response) => {
  try {
    const token = req.headers["x-webhook-token"] as string | undefined;
    const secret = process.env.LOVEABLE_WEBHOOK_SECRET;
    if (!secret || token !== secret) {
      return res
        .status(401)
        .json({ ok: false, message: "invalid webhook token" });
    }

    const { type, club_id, data, external_id } = req.body || {};
    if (!type || !club_id) {
      return res
        .status(400)
        .json({ ok: false, message: "missing type or club_id" });
    }

    const { data: members, error: memErr } = await supabaseAdmin
      .from("player_club_membership")
      .select("player_id")
      .eq("club_id", club_id);

    if (memErr) {
      logger.error("webhook fetch members error:", memErr);
      return res.status(500).json({ ok: false, message: memErr.message });
    }

    const playerIds = (members || [])
      .map((m: any) => m.player_id)
      .filter(Boolean);
    if (playerIds.length === 0) {
      return res.status(200).json({ ok: true, delivered: 0 });
    }

    const { data: playerRows, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("id,user_id")
      .in("id", playerIds as string[]);

    if (playerErr) {
      logger.error("webhook fetch players error:", playerErr);
      return res.status(500).json({ ok: false, message: playerErr.message });
    }

    const playerToUser: Record<string, string> = {};
    const userIds: string[] = [];
    (playerRows || []).forEach((p: any) => {
      if (p && p.id && p.user_id) {
        playerToUser[p.id] = p.user_id;
        userIds.push(p.user_id);
      }
    });
    logger.info(
      `webhook: members resolved players=${playerIds.length} linkedUsers=${
        userIds.length
      } userIds=${JSON.stringify(userIds)}`
    );

    if (userIds.length === 0) {
      logger.info(
        "webhook: no linked auth users for players, nothing to deliver"
      );
      return res.status(200).json({ ok: true, delivered: 0 });
    }

    const { data: settingsRows } = await supabaseAdmin
      .from("notification_settings")
      .select("*")
      .in("user_id", userIds);

    const settingsMap: Record<string, any> = {};
    (settingsRows || []).forEach((s: any) => (settingsMap[s.user_id] = s));
    logger.info(
      `webhook: loaded notification settings count=${
        (settingsRows || []).length
      }`
    );

    const persisted: any[] = [];
    const payload = data || {};

    for (const userId of userIds) {
      const s = settingsMap[userId];

      const emailOk = s ? !!s.email_notifications : false;
      const pushOk = s ? !!s.push_notifications : false;
      const inAppOk = true;

      const base = {
        user_id: userId,
        club_id,
        external_source: "loveable",
        external_id: external_id || null,
        event_type: type,
        payload,
        scheduled_at: new Date().toISOString(),
      } as any;

      if (inAppOk) {
        try {
          const recipients = getRoomRecipientCount(userId);
          const status = recipients > 0 ? "sent" : "failed";
          persisted.push({
            ...base,
            channel: "in_app",
            status,
            attempt_count: 1,
          });
          if (recipients > 0) {
            logger.info(`in-app recipients found user=${userId} count=${recipients}`);
          } else {
            logger.info(`no in-app recipients for user=${userId}`);
          }
        } catch (err) {
          logger.error("in-app check failed for user", userId, err);
          persisted.push({
            ...base,
            channel: "in_app",
            status: "failed",
            attempt_count: 1,
          });
        }
      }

      if (pushOk) {
        try {
          const { data: devices } = await supabaseAdmin
            .from("user_devices")
            .select("token,provider")
            .eq("user_id", userId)
            .eq("provider", "fcm");
          let anyOk = false;
          for (const d of devices || []) {
            const r = await sendPushToToken(d.token, {
              title: payload?.title,
              body: payload?.body,
              data: payload,
            });
            if (r.ok) anyOk = true;
          }
          logger.info(`push sent? ${anyOk} user=${userId}`);
        } catch (err) {
          logger.error("push send failed for user", userId, err);
        }
      }

      if (emailOk) {
        try {
          const { data: users } = await supabaseAdmin
            .from("users")
            .select("id,email")
            .eq("id", userId)
            .limit(1);
          const email = users && users[0] ? users[0].email : payload?.email;
          if (email) {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: email,
              subject: payload?.title || "Notification",
              text: payload?.body || JSON.stringify(payload || {}),
            });
            logger.info(`email sent user=${userId}`);
          } else {
            logger.info(`email not available for user=${userId}`);
          }
        } catch (err) {
          logger.error("email send failed for user", userId, err);
        }
      }
    }

    try {
      const inAppRows = (persisted || []).filter((p) => p.channel === "in_app");
      if (inAppRows.length > 0) {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("notifications")
          .insert(inAppRows)
          .select();

        if (insertErr) {
          logger.error("notifications insert error:", insertErr);
        } else if (inserted && Array.isArray(inserted)) {
          for (const row of inserted) {
            try {
              sendInAppNotification(row.user_id, row);
            } catch (emitErr) {
              logger.error("failed to emit inserted notification over socket", emitErr, row.id);
            }
          }
        }
      }
    } catch (err) {
      logger.error("failed to persist notifications:", err);
    }

    return res.status(200).json({ ok: true, delivered: persisted.length });
  } catch (err: any) {
    logger.error("handleClubEventsWebhook unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
};
