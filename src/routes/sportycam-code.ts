import { Router } from "express";
import generateSportycamCode from "../controllers/sportycam-code-generation";

const router = Router();

/**
 * @openapi
 * /api/sportycam-code:
 *   post:
 *     tags:
 *       - SportyCam Links
 *     summary: Sends SportyCam club code to provided email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Code is sent to email
 *       404:
 *         description: Invalid email
 */

// POST /sportycam-code  { email: string }
router.post("/", generateSportycamCode);

export default router;
