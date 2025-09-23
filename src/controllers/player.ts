import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { PlayerApplication } from "../models/player-application";
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
    const { data, error } = await supabase
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
    const playerResp = await supabase
      .from("players")
      .select("club_id")
      .eq("user_id", userId)
      .single();

    let clubsFromPlayers: any[] = [];
    if (playerResp.data?.club_id) {
      const clubsResp = await supabase
        .from("clubs")
        .select("*")
        .eq("id", playerResp.data.club_id);
      if (clubsResp.data) clubsFromPlayers = clubsResp.data;
    }

    const appResp = await supabase
      .from("player_applications")
      .select("club_id")
      .eq("user_id", userId)
      .in("application_type", ["member", "admin_added"])
      .single();

    let clubsFromApplications: any[] = [];
    if (appResp.data?.club_id) {
      const clubsResp = await supabase
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
    const bucket = "player-profiles";
    const filePath = `profile-photos/${userId}/${Date.now()}-${
      file.originalname
    }`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error)
      return res.status(400).json({ status: "failed", message: error.message });

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);

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

    return res
      .status(201)
      .json({ status: "success", message: "Player application created", data });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      message: error.message || "Internal Server Error",
    });
  }
};
