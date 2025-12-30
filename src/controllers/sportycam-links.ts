import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import logger from "../utils/logger";

const db = supabaseAdmin || supabase;

export const validateSportycamCode = async (req: Request, res: Response) => {
	try {
		const { code } = req.body || {};
		if (!code || typeof code !== "string") {
			return res
				.status(400)
				.json({ status: "failed", message: "`code` string is required in body" });
		}

		// First try a dedicated mapping table if present
		const { data: linkData, error: linkError } = await db
			.from("sportycam_links")
			.select("*")
			.eq("code", code)
			.limit(1)
			.single();

		if (linkError && (linkError as any).code !== "PGRST116") {
			logger.error("validateSportycamCode - sportycam_links query error:", linkError);
			// continue to fallback checks if table doesn't exist or other recoverable errors
		}

		if (linkData) {
			// If the mapping row contains a club id or name, prefer that
			const clubId = (linkData as any).club_id || (linkData as any).clubId || (linkData as any).id;
			const clubName = (linkData as any).club_name || (linkData as any).name || null;

			if (clubId && clubName) {
				return res.status(200).json({ status: "success", message: "Code valid", data: { id: clubId, name: clubName } });
			}

			if (clubId) {
				const { data: club, error: clubErr } = await db.from("clubs").select("id,name").eq("id", clubId).single();
				if (clubErr) {
					logger.error("validateSportycamCode - club fetch error for club_id:", clubErr);
					return res.status(400).json({ status: "failed", message: clubErr.message });
				}
				return res.status(200).json({ status: "success", message: "Code valid", data: club });
			}
		}

		// Fallback: try matching against `clubs` table by `username` or `id`
		let { data: clubByUsername, error: usernameErr } = await db.from("clubs").select("id,name").eq("username", code).limit(1).single();

		if (usernameErr && (usernameErr as any).code !== "PGRST116") {
			logger.error("validateSportycamCode - clubs by username error:", usernameErr);
			// continue to next fallback
		}

		if (clubByUsername) {
			return res.status(200).json({ status: "success", message: "Code valid", data: clubByUsername });
		}

		// Try matching by id
		const { data: clubById, error: idErr } = await db.from("clubs").select("id,name").eq("id", code).limit(1).single();

		if (idErr && (idErr as any).code !== "PGRST116") {
			logger.error("validateSportycamCode - clubs by id error:", idErr);
			return res.status(400).json({ status: "failed", message: idErr.message });
		}

		if (clubById) {
			return res.status(200).json({ status: "success", message: "Code valid", data: clubById });
		}

		return res.status(404).json({ status: "failed", message: "Invalid club code" });
	} catch (err: any) {
		logger.error("validateSportycamCode unexpected error:", err);
		return res.status(500).json({ status: "failed", message: err.message || "Internal Server Error" });
	}
};

export default validateSportycamCode;

