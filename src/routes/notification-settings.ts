import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getMyNotificationSettings,
  updateMyNotificationSettings,
} from "../controllers/notification-settings";

const router = Router();

/**
 * @openapi
 * /api/users/me/notification-settings:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notification settings for the authenticated user
 *     description: Returns the notification preferences for the authenticated user. If none exist, defaults will be created.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings fetched successfully
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
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     user_id:
 *                       type: string
 *                     email_notifications:
 *                       type: boolean
 *                     push_notifications:
 *                       type: boolean
 *                     new_training_sessions:
 *                       type: boolean
 *                     training_match_reminders:
 *                       type: boolean
 *                     club_announcements:
 *                       type: boolean
 *                     new_member_welcomes:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Update notification settings for the authenticated user
 *     description: Partially update one or more notification preference flags. Body should include any of the boolean fields to update.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email_notifications:
 *                 type: boolean
 *               push_notifications:
 *                 type: boolean
 *               new_training_sessions:
 *                 type: boolean
 *               training_match_reminders:
 *                 type: boolean
 *               club_announcements:
 *                 type: boolean
 *               new_member_welcomes:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
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
 *                   $ref: '#/components/schemas/NotificationSettings'
 *       400:
 *         description: Bad request / no valid fields provided
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

router.get("/me/notification-settings", requireAuth, getMyNotificationSettings);
router.patch(
  "/me/notification-settings",
  requireAuth,
  updateMyNotificationSettings
);

export default router;
