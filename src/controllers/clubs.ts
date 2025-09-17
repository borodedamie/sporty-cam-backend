import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

const SEARCH_FIELDS = ["name", "sport", "country", "state", "city", "location"];

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
      if (
        (error as any).code === "PGRST116" ||
        /not found/i.test(error.message)
      ) {
        return res
          .status(404)
          .json({ status: "failed", message: "Club not found" });
      }
      return res.status(400).json({ status: "failed", message: error.message });
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

export const searchClubs = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const city = (req.query.city as string) || undefined;
    const sport = (req.query.sport as string) || undefined;
    const country = (req.query.country as string) || undefined;
    const state = (req.query.state as string) || undefined;

    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt((req.query.pageSize as string) || "25", 10), 1),
      100
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let builder: any = supabase.from("clubs").select("*", { count: "exact" });

    if (city) builder = builder.eq("city", city);
    if (sport) builder = builder.eq("sport", sport);
    if (country) builder = builder.eq("country", country);
    if (state) builder = builder.eq("state", state);

    if (q) {
      const orConditions = SEARCH_FIELDS.map((f) => `${f}.ilike.%${q}%`).join(
        ","
      );
      builder = builder.or(orConditions);
    }

    builder = builder.range(from, to);

    const { data, error, count } = await builder;
    if (error) {
      return res.status(400).json({ status: "failed", message: error.message });
    }

    return res.status(200).json({
      status: "success",
      message: "Search results",
      data: {
        clubs: data || [],
        page,
        pageSize,
        total: count ?? data?.length ?? 0,
        totalPages: count ? Math.ceil(count / pageSize) : 1,
      },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({
        status: "failed",
        message: err.message || "Internal Server Error",
      });
  }
};
