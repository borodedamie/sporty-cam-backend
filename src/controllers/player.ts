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
      .from("player_applications")
      .select("*")
      .eq("user_id", userId)
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

export const getClubsAuthUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;
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

    const playerResp = await supabaseAdmin
      .from("players")
      .select("club_id")
      .eq("user_id", userId)
      .single();

    let clubsFromPlayers: any[] = [];
    if (playerResp.data?.club_id) {
      const clubsResp = await supabaseAdmin
        .from("clubs")
        .select("*")
        .eq("id", playerResp.data.club_id);
      if (clubsResp.data) clubsFromPlayers = clubsResp.data;
    }

    const appResp = await supabaseAdmin
      .from("player_applications")
      .select("club_id")
      .eq("user_id", userId)
      .in("application_type", ["member", "admin_added"])
      .single();

    let clubsFromApplications: any[] = [];
    if (appResp.data?.club_id) {
      const clubsResp = await supabaseAdmin
        .from("clubs")
        .select("*")
        .eq("id", appResp.data.club_id);
      if (clubsResp.data) clubsFromApplications = clubsResp.data;
    }

    const allClubs = [...clubsFromPlayers, ...clubsFromApplications];
    const uniqueClubs = Object.values(
      allClubs.reduce((acc, club) => {
        if (club && club.id) acc[club.id] = club;
        return acc;
      }, {} as Record<string, any>)
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
    const filePath = `profile-photos/${userId}/${Date.now()}-${file.originalname}`;

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
      .from("player_applications")
      .select("status, application_type")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      logger.error("Supabase fetch error:", fetchError);
      return res
        .status(400)
        .json({ status: "failed", message: fetchError.message });
    }

    if (!existingApplication) {
      return res.status(404).json({
        status: "failed",
        message: "Player application not found",
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

    const { data, error } = await supabaseAdmin
      .from("player_applications")
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
      message: "Player application updated successfully",
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
    const filePath = `uploaded-ids/${userId}/${Date.now()}-${file.originalname}`;

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
      .from("player_applications")
      .update({ uploaded_id_url: url })
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
    const filePath = `profile-photos/${userId}/${Date.now()}-${file.originalname}`;

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
      .from("player_applications")
      .update({ profile_photo_url: url })
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
    const filePath = `uploaded-ids/${userId}/${Date.now()}-${file.originalname}`;

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
      .from("player_applications")
      .update({ uploaded_id_url: url })
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
