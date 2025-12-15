import { Request, Response } from "express";
import cron from "node-cron";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";

const DEFAULT_HOLD_DAYS = 90;

export async function requestAccountDeletion(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (!supabaseAdmin) {
      logger.error(
        "requestAccountDeletion: SUPABASE_SERVICE_ROLE_KEY not configured"
      );
      return res
        .status(500)
        .json({ ok: false, message: "server misconfiguration" });
    }

    const { data: existing, error: existErr } = await supabaseAdmin
      .from("account_deletions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existErr) {
      logger.error("requestAccountDeletion: existing lookup error:", existErr);
      return res.status(500).json({ ok: false, message: existErr.message });
    }

    if (existing) {
      return res.json({
        ok: true,
        message: "deletion already scheduled",
        data: existing,
      });
    }

    const scheduledFor = new Date(
      Date.now() + DEFAULT_HOLD_DAYS * 24 * 3600 * 1000
    ).toISOString();

    const { data, error } = await supabaseAdmin
      .from("account_deletions")
      .insert({ user_id: userId, scheduled_for: scheduledFor })
      .select()
      .maybeSingle();

    if (error) {
      logger.error("requestAccountDeletion insert error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    return res.json({ ok: true, message: "deletion scheduled", data });
  } catch (err: any) {
    logger.error("requestAccountDeletion unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
}

export async function restoreAccountDeletion(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (!supabaseAdmin) {
      logger.error(
        "restoreAccountDeletion: SUPABASE_SERVICE_ROLE_KEY not configured"
      );
      return res
        .status(500)
        .json({ ok: false, message: "server misconfiguration" });
    }

    const { data, error } = await supabaseAdmin
      .from("account_deletions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      logger.error("restoreAccountDeletion error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    if (!data) {
      return res
        .status(404)
        .json({ ok: false, message: "no pending deletion found" });
    }

    return res.json({ ok: true, message: "deletion cancelled", data });
  } catch (err: any) {
    logger.error("restoreAccountDeletion unexpected error:", err);
    return res
      .status(500)
      .json({ ok: false, message: err.message || "Internal Server Error" });
  }
}

export async function deleteUserAccount(userId: string) {
  if (!supabaseAdmin) {
    logger.error("deleteUserAccount: SUPABASE_SERVICE_ROLE_KEY not configured");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }

  const summary: Record<string, any> = { userId };

  try {
    const tables = [
      "notifications",
      "user_devices",
      "player_applications",
      "players",
      "highlight_requests",
      "notification_settings",
      "custom_payments",
      "guest_fee_payments",
    ];

    const ops = tables.map(async (table) => {
      try {
        const r: any = await supabaseAdmin
          .from(table)
          .delete()
          .eq("user_id", userId)
          .select();
        return { table, data: r.data, error: r.error };
      } catch (err: any) {
        return { table, data: null, error: err };
      }
    });

    const results = await Promise.allSettled(ops);

    for (const r of results) {
      if (r.status === "fulfilled") {
        const val = r.value as any;
        const tbl = val.table;
        const err = val.error;
        const data = val.data;
        if (err) {
          logger.warn(`deleteUserAccount: ${tbl} delete error:`, err);
          summary[tbl] = {
            deleted: Array.isArray(data) ? data.length : 0,
            error: err,
          };
        } else {
          summary[tbl] = { deleted: Array.isArray(data) ? data.length : 0 };
        }
      } else {
        const reason = (r as PromiseRejectedResult).reason;
        logger.warn("deleteUserAccount: deletion promise rejected:", reason);
      }
    }

    try {
      if ((supabaseAdmin as any)?.auth?.admin?.deleteUser) {
        await (supabaseAdmin as any).auth.admin.deleteUser(userId);
        summary.auth = { deleted: true };
      } else {
        logger.warn(
          "deleteUserAccount: supabaseAdmin.auth.admin.deleteUser not available"
        );
        summary.auth = { deleted: false };
      }
    } catch (e) {
      logger.warn("deleteUserAccount: auth delete error:", e);
      summary.auth = { deleted: false, error: String(e) };
    }

    return summary;
  } catch (e: any) {
    logger.error("deleteUserAccount unexpected error:", e);
    throw e;
  }
}

export function scheduleAccountDeletionProcessor(options?: {
  cronExpression?: string;
  timezone?: string;
}) {
  const expr = options?.cronExpression ?? "0 2 * * *"; // default: daily at 02:00
  const tz = options?.timezone;

  cron.schedule(
    expr,
    async () => {
      try {
        if (!supabaseAdmin) {
          logger.error(
            "AccountDeletionProcessor: SUPABASE_SERVICE_ROLE_KEY not configured"
          );
          return;
        }

        const nowIso = new Date().toISOString();
        const { data: rows, error } = await supabaseAdmin
          .from("account_deletions")
          .select("*")
          .lte("scheduled_for", nowIso)
          .eq("status", "pending");

        if (error) {
          logger.error("AccountDeletionProcessor: fetch error:", error);
          return;
        }

        for (const row of rows || []) {
          try {
            const result = await deleteUserAccount(row.user_id);

            await supabaseAdmin
              .from("account_deletions")
              .update({
                status: "processed",
                processed_at: new Date().toISOString(),
              })
              .eq("id", row.id);

            logger.info(
              `AccountDeletionProcessor: processed user=${row.user_id}`,
              result
            );
          } catch (procErr: any) {
            logger.error(
              "AccountDeletionProcessor: processing error for user",
              row.user_id,
              procErr
            );
          }
        }
      } catch (e: any) {
        logger.error(
          "AccountDeletionProcessor: unexpected error:",
          e?.message || e
        );
      }
    },
    tz ? { timezone: tz } : undefined
  );

  logger.info(
    `AccountDeletionProcessor: scheduled with cron '${expr}'${
      tz ? ` (tz: ${tz})` : ""
    }`
  );
}

export default {
  requestAccountDeletion,
  restoreAccountDeletion,
  deleteUserAccount,
  scheduleAccountDeletionProcessor,
};
