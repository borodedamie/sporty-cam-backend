import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";

export const getClubEvents = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
    const pageSize = parseInt((req.query.pageSize as string) ?? "20", 10) || 20;
    const club_id = (req.query.club_id as string) ?? null;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const client = supabaseAdmin ?? supabase;

    let query = client.from("club_events").select("*");
    if (club_id) {
      query = query.eq("club_id", club_id);
    }

    const resp = await (query as any)
      .range(from, to)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if ((resp as any).error) {
      logger.error("getClubEvents - supabase error", (resp as any).error);
      return res.status(500).json({
        status: "failed",
        message: "Failed to fetch club events",
      });
    }

    const data = (resp as any).data;
    return res.status(200).json({
      status: "success",
      data: {
        events: data || [],
        page,
        pageSize,
        total: (resp as any).count || data?.length || 0,
        totalPages: (resp as any).count
          ? Math.ceil((resp as any).count / pageSize)
          : 1,
      },
    });
  } catch (err: any) {
    logger.error("getClubEvents - unexpected error", err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};
