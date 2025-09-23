import { Router } from "express";
import { getClubEvents } from "../controllers/club-events";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/club-events:
 *   get:
 *     tags:
 *      - club events
 *     summary: Get club events (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: club_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of club events
 */
router.get("/", requireAuth, getClubEvents);

export default router;
