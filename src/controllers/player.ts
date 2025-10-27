import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { PlayerApplication } from "../models/player-application";
import logger from "../utils/logger";
import { transporter } from "../utils/nodemailer";

export const getPlayerAuthUser = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;

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

    const { data, error } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) {
      throw error;
    }
    return res.status(200).json({
      status: "success",
  message: "Player fetched successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export const joinClub = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const email = req.user?.email ?? null;
  const { club_id } = req.body as { club_id?: string };

  if (!userId || !email) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: user not authenticated",
    });
  }
  if (!club_id) {
    return res
      .status(400)
      .json({ status: "failed", message: "club_id is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("player_applications")
      .select("id, status")
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .eq("club_id", club_id)
      .limit(1)
      .maybeSingle();

    if (!existingErr && existing?.id) {
      return res.status(200).json({
        status: "success",
        message: "Already applied to this club",
        data: existing,
      });
    }

    const derivedFullName =
      (req.user as any)?.user_metadata?.full_name ||
      (req.user as any)?.user_metadata?.name ||
      "";

    const payload: Partial<PlayerApplication> & Record<string, any> = {
      club_id,
      email,
      full_name: derivedFullName,
      password_hash: "EXISTING_PLAYER",
      status: "pending",
      user_id: userId,
      application_type: "member",
    };

    const { data, error } = await supabaseAdmin
      .from("player_applications")
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      logger.error("joinClub insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(201).json({
      status: "success",
      message: "Application submitted to join club",
      data,
    });
  } catch (err: any) {
    logger.error("joinClub error:", err?.message || err);
    return res.status(500).json({
      status: "failed",
      message: err?.message || "Internal Server Error",
    });
  }
};

export const getClubsAuthUser = async (req: Request, res: Response) => {
  const email = req.user?.email ?? null;
  if (!email) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized: user email not found in token",
    });
  }
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const { data: apps, error: appsError } = await supabaseAdmin
      .from("player_applications")
      .select("club_id")
      .eq("email", email)
      .order("created_at", { ascending: true });

    if (appsError) {
      return res
        .status(400)
        .json({ status: "failed", message: appsError.message });
    }

    const clubIds = Array.from(
      new Set((apps || []).map((a: any) => a?.club_id).filter(Boolean))
    );

    if (clubIds.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No clubs found for this user",
        data: [],
      });
    }

    const { data: clubs, error: clubsError } = await supabaseAdmin
      .from("clubs")
      .select("*")
      .in("id", clubIds);

    if (clubsError) {
      return res
        .status(400)
        .json({ status: "failed", message: clubsError.message });
    }

    const uniqueClubs = Object.values(
      (clubs || []).reduce((acc: Record<string, any>, club: any) => {
        if (club?.id) acc[club.id] = club;
        return acc;
      }, {})
    );

    return res.status(200).json({
      status: "success",
      message: "Clubs fetched successfully",
      data: uniqueClubs,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export const uploadPlayerProfilePhoto = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const file = req.file;

  if (!file) {
    return res
      .status(400)
      .json({ status: "failed", message: "File is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const bucket = "player-profiles";
    const filePath = `profile-photos/${userId}/${Date.now()}-${
      file.originalname
    }`;

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error)
      return res.status(400).json({ status: "failed", message: error.message });

    const { data: pub } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return res.status(200).json({
      status: "success",
      message: "Profile photo uploaded successfully",
      url: pub.publicUrl,
      userId,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

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

    const playerEmail =
      (req.user as any)?.email || (body as any)?.email || undefined;
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
      logger.warn(
        "No player email found on request; skipping confirmation email."
      );
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

export const updatePlayerApplication = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;

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

    const { data: existingApplication, error: fetchError } = await supabaseAdmin
      .from("players")
      .select("id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      logger.error("Supabase fetch error:", fetchError);
      return res
        .status(400)
        .json({ status: "failed", message: fetchError.message });
    }

    if (!existingApplication) {
      return res.status(404).json({
        status: "failed",
        message: "Player not found",
      });
    }

    // if (
    //   existingApplication.status !== "approved" ||
    //   existingApplication.application_type !== "member"
    // ) {
    //   return res.status(403).json({
    //     status: "failed",
    //     message:
    //       "Only approved members can update their player application information",
    //   });
    // }

    const updateData = req.body;

    const { id, user_id, created_at, updated_at, ...allowedUpdates } =
      updateData;
    (allowedUpdates as any).updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("players")
      .update(allowedUpdates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Supabase update error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Player data updated successfully",
      data,
    });
  } catch (error: any) {
    logger.error("updatePlayerApplication error:", error);
    return res.status(500).json({
      status: "failed",
      message: error.message || "Internal Server Error",
    });
  }
};

export const uploadPlayerId = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const file = req.file;

  if (!userId) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  if (!file) {
    return res
      .status(400)
      .json({ status: "failed", message: "File is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const bucket = "player-profiles";
    const filePath = `uploaded-ids/${userId}/${Date.now()}-${
      file.originalname
    }`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return res
        .status(400)
        .json({ status: "failed", message: uploadError.message });
    }

    const { data: pub } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);
    const url = pub?.publicUrl;

    const { data, error } = await supabaseAdmin
      .from("players")
      .update({ uploaded_id_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update uploaded_id_url:", error);
      return res.status(500).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Uploaded ID saved",
      url,
      userId,
      data,
    });
  } catch (err: any) {
    logger.error("savePlayerUploadedId error:", err.message || err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export const updatePlayerProfilePhoto = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const file = req.file;

  if (!file) {
    return res
      .status(400)
      .json({ status: "failed", message: "File is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const bucket = "player-profiles";
    const filePath = `profile-photos/${userId}/${Date.now()}-${
      file.originalname
    }`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return res
        .status(400)
        .json({ status: "failed", message: uploadError.message });
    }

    const { data: pub } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);
    const url = pub?.publicUrl;

    const { data, error } = await supabaseAdmin
      .from("players")
      .update({ profile_photo_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update profile_photo_url:", error);
      return res.status(500).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Profile photo saved",
      url,
      userId,
      data,
    });
  } catch (err: any) {
    logger.error("savePlayerProfilePhoto error:", err.message || err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export const updatePlayerUploadedId = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const file = req.file;

  if (!userId) {
    return res.status(401).json({ status: "failed", message: "Unauthorized" });
  }
  if (!file) {
    return res
      .status(400)
      .json({ status: "failed", message: "File is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const bucket = "player-profiles";
    const filePath = `uploaded-ids/${userId}/${Date.now()}-${
      file.originalname
    }`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      logger.error("Supabase storage upload error:", uploadError);
      return res
        .status(400)
        .json({ status: "failed", message: uploadError.message });
    }

    const { data: pub } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);
    const url = pub?.publicUrl;

    const { data, error } = await supabaseAdmin
      .from("players")
      .update({ uploaded_id_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error("Failed to update uploaded_id_url:", error);
      return res.status(500).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Uploaded ID saved",
      url,
      userId,
      data,
    });
  } catch (err: any) {
    logger.error("savePlayerUploadedId error:", err.message || err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};
