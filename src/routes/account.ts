import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requestAccountDeletion, restoreAccountDeletion } from "../controllers/account";

const router = Router();

/**
 * @openapi
 * /api/account/delete-request:
 *   post:
 *     tags:
 *       - Account
 *     summary: Request account deletion (scheduled after 90 days)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion scheduled
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 * /api/account/restore:
 *   post:
 *     tags:
 *       - Account
 *     summary: Restore / cancel a pending account deletion request
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deletion cancelled
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

router.post("/delete-request", requireAuth, requestAccountDeletion);
router.post("/restore", requireAuth, restoreAccountDeletion);

export default router;
