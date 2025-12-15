import cron from "node-cron";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";
import { deleteUserAccount } from "../controllers/account";

export function scheduleAccountDeletionsJob(options?: {
  cronExpression?: string;
  timezone?: string;
}) {
  const expr = options?.cronExpression ?? "0 2 * * *";
  const tz = options?.timezone;

  cron.schedule(
    expr,
    async () => {
      try {
        if (!supabaseAdmin) {
          logger.error(
            "processAccountDeletions: SUPABASE_SERVICE_ROLE_KEY not configured"
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
          logger.error("processAccountDeletions: fetch error:", error);
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
              `processAccountDeletions: processed user=${row.user_id}`,
              result
            );
          } catch (e: any) {
            logger.error(
              "processAccountDeletions: error processing user",
              row.user_id,
              e
            );
          }
        }
      } catch (e: any) {
        logger.error(
          "processAccountDeletions: unexpected error:",
          e?.message || e
        );
      }
    },
    tz ? { timezone: tz } : undefined
  );

  logger.info(
    `processAccountDeletions: scheduled with cron '${expr}'${
      tz ? ` (tz: ${tz})` : ""
    }`
  );
}

export default { scheduleAccountDeletionsJob };
