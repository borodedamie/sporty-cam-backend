import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";

async function main() {
  try {
    if (!supabaseAdmin) {
      logger.error("Backfill: supabaseAdmin not configured");
      process.exit(1);
    }

    const { data: apps, error: appsErr } = await supabaseAdmin
      .from("player_applications")
      .select("id, user_id, club_id, status")
      .eq("status", "approved");

    if (appsErr) throw appsErr;
    const rows = apps || [];
    logger.info(`Backfill: found ${rows.length} approved applications`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const app of rows) {
      const { id: appId, user_id: userId, club_id: clubId } = app as any;
      if (!userId || !clubId) {
        skipped++;
        continue;
      }

      const { data: player, error: playerErr } = await supabaseAdmin
        .from("players")
        .select("id")
        .eq("user_id", userId)
        .eq("club_id", clubId)
        .limit(1)
        .maybeSingle();

      if (playerErr) {
        logger.warn("Backfill: error fetching player for app", appId, playerErr.message || playerErr);
        errors++;
        continue;
      }
      if (!player || !player.id) {
        skipped++;
        continue;
      }

      const playerId = player.id as string;

      const { data: memByPlayer, error: memByPlayerErr } = await supabaseAdmin
        .from("player_club_membership")
        .select("id")
        .eq("player_id", playerId)
        .eq("club_id", clubId)
        .limit(1)
        .maybeSingle();

      if (!memByPlayerErr && memByPlayer?.id) {
        skipped++;
        continue;
      }

      const { data: memByApp, error: memByAppErr } = await supabaseAdmin
        .from("player_club_membership")
        .select("id")
        .eq("player_application_id", appId)
        .eq("club_id", clubId)
        .limit(1)
        .maybeSingle();

      if (!memByAppErr && memByApp?.id) {
        skipped++;
        continue;
      }

      const membershipPayload = {
        player_application_id: appId,
        player_id: playerId,
        club_id: clubId,
        status: "active",
        joined_at: new Date().toISOString(),
        membership_type: "regular",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabaseAdmin
        .from("player_club_membership")
        .insert(membershipPayload as any);

      if (insertErr) {
        logger.error("Backfill: failed to insert membership for app", appId, insertErr.message || insertErr);
        errors++;
      } else {
        created++;
      }
    }

    logger.info(`Backfill complete. created=${created}, skipped=${skipped}, errors=${errors}`);
    process.exit(0);
  } catch (e: any) {
    logger.error("Backfill: unexpected error", e?.message || e);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
