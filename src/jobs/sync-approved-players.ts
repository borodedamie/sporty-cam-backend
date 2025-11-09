import cron from "node-cron";
import { randomUUID } from "crypto";
import logger from "../utils/logger";
import { supabaseAdmin } from "../lib/supabase";
import { Player } from "../models/player";

type Transform = (input: {
  application: any;
  base: Player;
}) => Partial<Player> | void;

function buildPlayerPayload(application: any, transform?: Transform): Player {
  const now = new Date().toISOString();

  const base: Player = {
    id: randomUUID(),
    club_id: application.club_id,
    user_id: application.user_id,
    name:
      application.full_name ??
      application.name ??
      application.email ??
      application.username ??
      application.id ??
      "",
    position: application.position ?? "unspecified",
    jersey_number: application.jersey_number ?? 0,
    is_captain: application.is_captain ?? false,
    is_available: application.is_available ?? true,
    created_at: application.created_at ?? now,
    updated_at: now,
    application_type: application.application_type ?? undefined,
    status: application.status ?? undefined,
    full_name: application.full_name ?? undefined,
    email: application.email ?? undefined,
    preferred_training_day: application.preferred_training_day ?? null,
    time_preference: application.time_preference ?? null,
    preferred_jersey_name: application.preferred_jersey_name ?? null,
    address: application.address ?? null,
    date_of_birth: application.date_of_birth ?? null,
    age: application.age ?? null,
    phone_number: application.phone_number ?? null,
    hmo_provider: application.hmo_provider ?? null,
    genotype: application.genotype ?? null,
    health_concerns: application.health_concerns ?? null,
    emergency_contact_1_name: application.emergency_contact_1_name ?? null,
    emergency_contact_1_relationship:
      application.emergency_contact_1_relationship ?? null,
    emergency_contact_1_phone: application.emergency_contact_1_phone ?? null,
    emergency_contact_2_name: application.emergency_contact_2_name ?? null,
    emergency_contact_2_relationship:
      application.emergency_contact_2_relationship ?? null,
    emergency_contact_2_phone: application.emergency_contact_2_phone ?? null,
    referee_in_club:
      typeof application.referee_in_club === "boolean"
        ? String(application.referee_in_club)
        : application.referee_in_club ?? null,
    payment_required: application.payment_required ?? null,
    payment_status: application.payment_status ?? null,
    stripe_session_id: application.stripe_session_id ?? null,
    admin_notes: application.admin_notes ?? null,
    reviewed_by: application.reviewed_by ?? null,
    reviewed_at: application.reviewed_at ?? null,
    social_media_handles: application.social_media_handles ?? null,
    motivation_letter: application.motivation_letter ?? null,
    previous_club_experience: application.previous_club_experience ?? null,
    approved_at: application.approved_at ?? null,
    profile_photo_url: application.profile_photo_url ?? null,
    jersey_name: application.jersey_name ?? null,
    profile_visibility: application.profile_visibility ?? null,
    default_availability:
      typeof application.default_availability === "boolean"
        ? application.default_availability
        : null,
    bio: application.bio ?? null,
    notification_preferences: application.notification_preferences ?? null,
    passport_document_url: application.passport_document_url ?? null,
    profile_picture_url: application.profile_picture_url ?? null,
    password_hash: application.password_hash ?? null,
    first_name: application.first_name ?? null,
    last_name: application.last_name ?? null,
    username: application.username ?? null,
    state: application.state ?? null,
    city: application.city ?? null,
    interested_in: application.interested_in ?? null,
    preferred_sport: application.preferred_sport ?? null,
    country: application.country ?? null,
    identification: application.identification ?? null,
    uploaded_id_url: application.uploaded_id_url ?? null,
  } as Player;

  const extra = transform ? transform({ application, base }) || {} : {};
  return { ...base, ...(extra as Partial<Player>) } as Player;
}

export function scheduleApprovedPlayersSync(options?: {
  cronExpression?: string;
  timezone?: string;
  transform?: Transform;
}) {
  const expr = options?.cronExpression ?? "*/5 * * * *";
  const tz = options?.timezone;
  const transform = options?.transform;

  cron.schedule(
    expr,
    async () => {
      try {
        if (!supabaseAdmin) {
          logger.error(
            "ApprovedPlayersSync: SUPABASE_SERVICE_ROLE_KEY not configured"
          );
          return;
        }

        const { data: apps, error: appsError } = await supabaseAdmin
          .from("player_applications")
          .select("*")
          .eq("status", "approved");

        if (appsError) {
          logger.error("ApprovedPlayersSync: fetch apps error:", appsError);
          return;
        }

        for (const app of apps || []) {
          if (!app?.user_id || !app?.club_id) continue;

          const { data: existing, error: existErr } = await supabaseAdmin
            .from("players")
            .select("id")
            .eq("user_id", app.user_id)
            .eq("club_id", app.club_id)
            .limit(1)
            .maybeSingle();

          if (!existErr && existing?.id) {
            continue;
          }

          const payload = buildPlayerPayload(app, transform);

          if (payload.name && payload.position) {
            const { data: dup, error: dupErr } = await supabaseAdmin
              .from("players")
              .select("id")
              .eq("club_id", payload.club_id)
              .eq("name", payload.name)
              .eq("position", payload.position)
              .limit(1)
              .maybeSingle();
            if (!dupErr && dup?.id) {
              continue;
            }
          }

          const { data: insertedPlayer, error: insertErr } = await supabaseAdmin
            .from("players")
            .insert(payload as any)
            .select()
            .maybeSingle();

          if (insertErr) {
            logger.error("ApprovedPlayersSync: insert error:", insertErr);
          }

          try {
            const playerId = insertedPlayer?.id;
            if (playerId) {
              const { data: existingMembership, error: existMemErr } = await supabaseAdmin
                .from("player_club_membership")
                .select("id")
                .eq("player_id", playerId)
                .eq("club_id", payload.club_id)
                .limit(1)
                .maybeSingle();

              if (!existMemErr && existingMembership?.id) {
              } else {
                const { data: existingByApp, error: existByAppErr } = await supabaseAdmin
                  .from("player_club_membership")
                  .select("id")
                  .eq("player_application_id", app.id)
                  .eq("club_id", payload.club_id)
                  .limit(1)
                  .maybeSingle();

                if (!existByAppErr && existingByApp?.id) {
                } else {
                  const membershipPayload = {
                    player_application_id: app.id,
                    player_id: playerId,
                    club_id: payload.club_id,
                    status: "active",
                    joined_at: new Date().toISOString(),
                    membership_type: "regular",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };

                  const { error: memInsertErr } = await supabaseAdmin
                    .from("player_club_membership")
                    .insert(membershipPayload as any);
                  if (memInsertErr) {
                    logger.error("ApprovedPlayersSync: membership insert error:", memInsertErr);
                  }
                }
              }
            }
          } catch (memErr: any) {
            logger.error("ApprovedPlayersSync: membership handling error:", memErr?.message || memErr);
          }
        }

        logger.info(
          `ApprovedPlayersSync: processed ${
            (apps || []).length
          } approved applications`
        );
      } catch (e: any) {
        logger.error("ApprovedPlayersSync: unexpected error:", e?.message || e);
      }
    },
    tz ? { timezone: tz } : undefined
  );

  logger.info(
    `ApprovedPlayersSync: scheduled with cron '${expr}'${
      tz ? ` (tz: ${tz})` : ""
    }`
  );
}
