import { Router } from "express";
import { createPlayerApplication } from "../controllers/player-application";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/player-applications:
 *   post:
 *     tags:
 *       - player-applications
 *     summary: Create a player application
 *     description: Inserts a new `player_applications` row for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlayerApplication'
 *     responses:
 *       201:
 *         description: Player application created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post("/", requireAuth, createPlayerApplication);

export default router;
