import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { PlayerApplication } from "../models/player-application";
import logger from "../utils/logger";
import { transporter } from "../utils/nodemailer";

export const createPlayerApplication = async (req: Request, res: Response) => {
  const userId = req.body.user_id ?? req.user?.id ?? req.user?.sub;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const body: PlayerApplication = req.body;

    const payload = {
      application_type: "member",
      user_id: userId,
      ...body,
    };

    const { data, error } = await supabaseAdmin
      .from("player_applications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("Supabase insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    let clubName: string | undefined;
    try {
      const clubId = (payload as any)?.club_id;
      if (clubId) {
        const { data: clubResp, error: clubErr } = await supabaseAdmin
          .from("clubs")
          .select("name")
          .eq("id", clubId)
          .single();
        if (!clubErr) clubName = clubResp?.name;
      }
    } catch (e) {
      logger.warn(
        "Could not fetch club name for email:",
        (e as any)?.message || e
      );
    }

    const playerEmail = (req.user as any)?.email || (body as any)?.email;
    const fullName =
      (body as any)?.full_name ||
      (body as any)?.name ||
      (req.user as any)?.user_metadata?.full_name ||
      "Player";

    if (playerEmail) {
      const generatePlayerApplicationEmailHtml = (opts: {
        fullName: string;
        clubName?: string;
      }) => `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px; }
              .card { max-width:600px; margin:auto; background:#fff; border-radius:8px; padding:24px; }
              .title { margin:0 0 12px; color:#111827; }
              .muted { color:#4b5563; }
              .strong { color:#111827; font-weight:600; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 class="title">Application received</h2>
              <p class="muted">Hi ${opts.fullName},</p>
              <p class="muted">
                Thanks for submitting your player application${
                  opts.clubName
                    ? ` to <span class="strong">${opts.clubName}</span>`
                    : ""
                }.
                A club admin will review your details shortly.
              </p>
              <p class="muted">
                Your account will become active once your application is approved. We’ll notify you by email when that happens.
              </p>
              <p class="muted">If you didn’t make this request, please ignore this email.</p>
              <p class="muted">— Sporty cam Support</p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `Sporty cam Support <${process.env.EMAIL_USER}>`,
        to: playerEmail,
        subject: "We received your player application",
        html: generatePlayerApplicationEmailHtml({ fullName, clubName }),
      };

      transporter.sendMail(mailOptions, (err: any, info: any) => {
        if (err) {
          logger.error(
            "Error sending player application email:",
            err?.message || err
          );
        } else {
          logger.info("Player application email sent:", info?.response);
        }
      });
    } else {
      logger.warn("No player email found on request; skipping confirmation email.");
    }

    return res
      .status(201)
      .json({ status: "success", message: "Player application created", data });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: (error as any).message || "Internal Server Error",
    });
  }
};

export default createPlayerApplication;
