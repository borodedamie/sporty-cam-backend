import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMyNotifications, markNotificationRead } from "../controllers/notifications";

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get paginated in-app notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Page size (default 25, max 100)
 *     responses:
 *       200:
 *         description: Paginated list of notifications
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /api/notifications/{id}/read:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification id (UUID)
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

router.get("/", requireAuth, getMyNotifications);
router.post("/:id/read", requireAuth, markNotificationRead);

export default router;