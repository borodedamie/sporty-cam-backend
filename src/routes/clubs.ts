import { Router } from "express";
import { getClubs, getClubById } from "../controllers/clubs";

const router = Router();

/**
 * @openapi
 * /api/clubs:
 *   get:
 *     tags:
 *       - clubs
 *     summary: List clubs
 *     description: Fetch paginated list of clubs.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 25
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: A list of clubs
 *
 * /api/clubs/{id}:
 *   get:
 *     tags:
 *       - clubs
 *     summary: Get club by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Club fetched successfully
 *       404:
 *         description: Club not found
 */

router.get("/", getClubs);
router.get("/:id", getClubById);

export default router;