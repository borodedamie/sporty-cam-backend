import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

export const getClubs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt((req.query.pageSize as string) || "25", 10), 1),
      100
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const query = supabase
      .from("clubs")
      .select("*", { count: "exact" })
      .range(from, to);
    const { data, error, count } = await query;

    if (error) {
      return res
        .status(400)
        .json({ status: "failed", message: error.message, data: null });
    }

    return res.status(200).json({
      status: "success",
      message: "Clubs fetched successfully",
      data: {
        clubs: data || [],
        page,
        pageSize,
        total: count ?? data?.length ?? 0,
        totalPages: count ? Math.ceil(count / pageSize) : 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};

export const getClubById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ status: "failed", message: "Club id param is required" });
    }

    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if ((error as any).code === "PGRST116" || /not found/i.test(error.message)) {
        return res
          .status(404)
          .json({ status: "failed", message: "Club not found" });
      }
      return res
        .status(400)
        .json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Club fetched successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error",
    });
  }
};