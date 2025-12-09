import { Router } from "express";
import { createGuest } from "../controllers/guest";

const router = Router();

/**
 * @openapi
 * /api/guests:
 *   post:
 *     tags:
 *       - Guests
 *     summary: Create a guest player application
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email]
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               club_id:
 *                 type: string
 *               payment_required:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Guest created
 */
router.post("/", createGuest);

export default router;
