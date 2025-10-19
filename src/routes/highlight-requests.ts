import { Router } from "express";
import { createHighlightRequest } from "../controllers/highlight-requests";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/highlight-requests:
 *   post:
 *     summary: Create a highlight request
 *     tags:
 *       - Highlights
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               training_date:
 *                 type: string
 *                 format: date-time
 *               highlight_type:
 *                 type: string
 *               special_requests:
 *                 type: string
 *               highlight_id:
 *                 type: string
 *             required:
 *               - training_date
 *     responses:
 *       201:
 *         description: Highlight request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HighlightRequest'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     HighlightRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         training_date:
 *           type: string
 *           format: date-time
 *         highlight_type:
 *           type: string
 *           nullable: true
 *         special_requests:
 *           type: string
 *           nullable: true
 *         highlight_id:
 *           type: string
 *           nullable: true
 *         player_id:
 *           type: string
 *         user_id:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *
 */
router.post("/", requireAuth, createHighlightRequest);

export default router;