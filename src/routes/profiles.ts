import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * @openapi
 * /profiles/me:
 *   get:
 *     tags:
 *       - profiles
 *     summary: Get current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's profile
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

export default router;
