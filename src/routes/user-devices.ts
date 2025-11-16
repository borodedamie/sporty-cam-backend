import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  registerDevice,
  unregisterDevice,
  listDevices,
} from "../controllers/user-devices";

const router = Router();

/**
 * @openapi
 * /api/users/devices:
 *   post:
 *     tags:
 *       - Users
 *     summary: Register or update a device token for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               provider:
 *                 type: string
 *                 default: fcm
 *               platform:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Device registered
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *
 *   get:
 *     tags:
 *       - Users
 *     summary: List registered devices for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     tags:
 *       - Users
 *     summary: Unregister a device token for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device unregistered
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/", requireAuth, registerDevice);
router.get("/", requireAuth, listDevices);
router.delete("/", requireAuth, unregisterDevice);

export default router;
