import { Router } from "express";
import validateSportycamCode from "../controllers/sportycam-links";

const router = Router();

/**
 * @openapi
 * /api/sportycam-links:
 *   post:
 *     tags:
 *       - SportyCam Links
 *     summary: Validate SportyCam club code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *             required:
 *               - code
 *     responses:
 *       200:
 *         description: Code is valid
 *       404:
 *         description: Invalid club code
 */

// POST /sportycam-links  { code: string }
router.post("/", validateSportycamCode);

export default router;
