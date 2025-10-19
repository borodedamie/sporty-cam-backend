import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";
import { HighlightRequest } from "../models/highlight-requests";
import { transporter } from "../utils/nodemailer";

export const createHighlightRequest = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? (req.user as any)?.sub;

  if (!userId) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: user not authenticated",
    });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const { training_date, highlight_type, special_requests, highlight_id } =
      req.body as Partial<HighlightRequest>;

    if (!training_date) {
      return res
        .status(400)
        .json({ status: "failed", message: "training_date is required" });
    }

    const { data: app, error: appErr } = await supabaseAdmin
      .from("player_applications")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (appErr) {
      logger.error("player_applications fetch error:", appErr);
      return res
        .status(400)
        .json({ status: "failed", message: appErr.message });
    }
    if (!app?.id) {
      return res.status(404).json({
        status: "failed",
        message: "Player profile not found for this user",
      });
    }

    const payload: Omit<HighlightRequest, "id" | "created_at"> = {
      training_date,
      highlight_type: highlight_type ?? null,
      special_requests: special_requests ?? null,
      highlight_id: highlight_id ?? null,
      player_id: app.id,
      user_id: userId,
    };

    const { data, error } = await supabaseAdmin
      .from("highlight_requests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("highlight_requests insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    const playerEmail =
      (req.user as any)?.email ||
      (req.user as any)?.user_metadata?.email ||
      null;

    const fullName = (req.user as any)?.user_metadata?.full_name || "Player";

    if (playerEmail) {
      const formattedDate = (() => {
        const d = new Date(training_date as string);
        return isNaN(d.getTime()) ? String(training_date) : d.toUTCString();
      })();

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background:#f6f7f9; margin:0; padding:24px; }
              .card { max-width:600px; margin:auto; background:#fff; border-radius:8px; padding:24px; }
              .title { margin:0 0 12px; color:#111827; }
              .muted { color:#4b5563; }
              .strong { color:#111827; font-weight:600; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 class="title">Highlight request received</h2>
              <p class="muted">Hi ${fullName},</p>
              <p class="muted">
                We’ve received your highlight request${
                  highlight_type
                    ? ` for <span class="strong">${highlight_type}</span>`
                    : ""
                }.
              </p>
              <p class="muted">
                Training date: <span class="strong">${formattedDate}</span>
              </p>
              ${
                special_requests
                  ? `<p class="muted">Special requests: <span class="strong">${special_requests}</span></p>`
                  : ""
              }
              <p class="muted">
                Our team will process your request and email you when your highlight is ready.
              </p>
              <p class="muted">— Sporty Cam</p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `Sporty Cam <${process.env.EMAIL_USER}>`,
        to: playerEmail,
        subject: "We received your highlight request",
        html,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          logger.error(
            "Error sending highlight request email:",
            err?.message || err
          );
        } else {
          logger.info("Highlight request email sent:", info?.response);
        }
      });
    } else {
      logger.warn("No email on token; skipping highlight request email.");
    }

    return res.status(201).json({
      status: "success",
      message: "Highlight request created",
      data,
    });
  } catch (err: any) {
    logger.error("createHighlightRequest error:", err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};
