import { Router } from "express";
import { handleClubEventsWebhook } from "../controllers/webhooks";

const router = Router();

/**
 * @openapi
 * /api/webhooks/club-events:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Receive club event webhooks from Loveable
 *     description: Receive events from the external Loveable service. The request must include the shared secret in the `x-webhook-token` header. The payload should include `type` and `club_id` and may include `data` and `external_id`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, club_id]
 *             properties:
 *               type:
 *                 type: string
 *                 description: Event type identifier (e.g., player_joined, match_updated)
 *               club_id:
 *                 type: string
 *                 description: Club id (must match club in your system)
 *               external_id:
 *                 type: string
 *                 description: Optional external event id from Loveable
 *               data:
 *                 type: object
 *                 description: Arbitrary event payload sent by Loveable
 *     parameters:
 *       - in: header
 *         name: x-webhook-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Shared webhook secret configured in Loveable
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 delivered:
 *                   type: integer
 *       400:
 *         description: Bad request (missing fields)
 *       401:
 *         description: Invalid webhook token
 *       500:
 *         description: Server error
 */

router.post("/club-events", handleClubEventsWebhook);

export default router;
