import { Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { PlayerApplication } from "../models/player-application";
import { Player } from "../models/player";
import logger from "../utils/logger";

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

    const { data: existingPlayer, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (playerErr) {
      logger.error("joinClub fetch player error:", playerErr);
    }

    if (existingPlayer?.id) {
      const { data: membership, error: membershipErr } = await supabaseAdmin
        .from("player_club_membership")
        .select("id, player_id, club_id")
        .eq("player_id", existingPlayer.id)
        .eq("club_id", club_id)
        .limit(1)
        .maybeSingle();

      if (!membershipErr && membership?.id) {
        return res.status(200).json({
          status: "success",
          message: "User is already a member of this club",
          data: membership,
        });
      }
    }

    const { data: existingApp, error: existingErr } = await supabaseAdmin
      .from("player_applications")
      .select("*")
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .eq("club_id", club_id)
      .limit(1)
      .maybeSingle();

    if (!existingErr && existingApp?.id) {
      return res.status(200).json({
        status: "success",
        message: "Already applied to this club",
        data: existingApp,
      });
    }

    const derivedFullName =
      (req.user as any)?.user_metadata?.full_name ||
      (req.user as any)?.user_metadata?.name ||
      "";

    const payload: Partial<PlayerApplication> & Record<string, any> = {
      club_id,
      email,
      full_name: existingPlayer?.name || derivedFullName,
      password_hash: existingPlayer ? "EXISTING_PLAYER" : "",
      status: "pending",
      user_id: userId,
      application_type: "member",
      phone_number: existingPlayer?.phone_number,
      date_of_birth: existingPlayer?.date_of_birth,
      address: existingPlayer?.address,
      profile_photo_url: existingPlayer?.profile_photo_url,
      uploaded_id_url: existingPlayer?.uploaded_id_url,
      jersey_name: existingPlayer?.jersey_name,
      preferred_jersey_name: existingPlayer?.preferred_jersey_name,
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

export const leaveClub = async (req: Request, res: Response) => {
  const userId = req.user?.id ?? req.user?.sub;
  const { club_id } = req.body as { club_id?: string };

  if (!userId) {
    return res
      .status(401)
      .json({
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

    const { data: player, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (playerErr) {
      logger.error("leaveClub fetch player error:", playerErr);
      return res
        .status(400)
        .json({ status: "failed", message: playerErr.message });
    }

    if (!player?.id) {
      return res
        .status(404)
        .json({ status: "failed", message: "Player not found" });
    }

    const { data: membership, error: memErr } = await supabaseAdmin
      .from("player_club_membership")
      .select("id")
      .eq("player_id", player.id)
      .eq("club_id", club_id)
      .limit(1)
      .maybeSingle();

    if (memErr) {
      logger.error("leaveClub fetch membership error:", memErr);
      return res
        .status(400)
        .json({ status: "failed", message: memErr.message });
    }

    if (!membership?.id) {
      return res
        .status(404)
        .json({ status: "failed", message: "Membership not found" });
    }

    const { data, error } = await supabaseAdmin
      .from("player_club_membership")
      .delete()
      .eq("id", membership.id)
      .select()
      .single();

    if (error) {
      logger.error("leaveClub delete error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res
      .status(200)
      .json({ status: "success", message: "Left club successfully", data });
  } catch (err: any) {
    logger.error("leaveClub error:", err?.message || err);
    return res
      .status(500)
      .json({
        status: "failed",
        message: err?.message || "Internal Server Error",
      });
  }
};

export const getClubsAuthUser = async (req: Request, res: Response) => {
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
    const { data: player, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (playerErr) {
      logger.error("getClubsAuthUser fetch player error:", playerErr);
      return res
        .status(400)
        .json({ status: "failed", message: playerErr.message });
    }

    if (!player?.id) {
      return res
        .status(200)
        .json({
          status: "success",
          message: "No clubs found for this user",
          data: [],
        });
    }

    const { data: memberships, error: memErr } = await supabaseAdmin
      .from("player_club_membership")
      .select("club_id")
      .eq("player_id", player.id);

    if (memErr) {
      return res
        .status(400)
        .json({ status: "failed", message: memErr.message });
    }

    const clubIds = Array.from(
      new Set((memberships || []).map((m: any) => m?.club_id).filter(Boolean))
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

export const updatePlayer = async (req: Request, res: Response) => {
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
    logger.error("updatePlayer error:", error);
    return res.status(500).json({
      status: "failed",
      message: error.message || "Internal Server Error",
    });
  }
};

export const createPlayer = async (req: Request, res: Response) => {
  const userId = req.body.user_id ?? req.user?.id ?? req.user?.sub;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        status: "failed",
        message: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY required",
      });
    }

    const body = req.body as Partial<Player> & Record<string, any>;

    const payload = {
      ...(body as any),
      user_id: userId,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("players")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("createPlayer supabase insert error:", error);
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res
      .status(201)
      .json({ status: "success", message: "Player created", data });
  } catch (err: any) {
    logger.error("createPlayer error:", err?.message || err);
    return res.status(500).json({
      status: "failed",
      message: err?.message || "Internal Server Error",
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
