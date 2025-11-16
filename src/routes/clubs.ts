import { Router } from "express";
import { getClubs, getClubById, searchClubs, getClubHighlights } from "../controllers/clubs";

const router = Router();

/**
 * @openapi
 * /api/clubs:
 *   get:
 *     tags:
 *       - Clubs
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
 *       - Clubs
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
 *
 * /api/clubs/search:
 *   get:
 *     tags:
 *       - Clubs
 *     summary: Search clubs
 *     description: Search clubs by q (search across name, sport, country, state, city) and/or filter by city and sport. Pagination supported.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: General search string matched across name, sport, country, state, city
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: sport
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 25
 *     responses:
 *       200:
 *         description: Search results
 *
 * /api/clubs/{id}/highlights:
 *   get:
 *     tags:
 *       - Clubs
 *     summary: Get public highlights for a club
 *     description: Returns public vault content (highlights) for the specified club. Supports optional filtering by content_category and pagination.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The club id
 *       - in: query
 *         name: content_category
 *         schema:
 *           type: string
 *         description: Optional content category filter (e.g., highlight, reel)
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
 *         description: A paginated list of highlights
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

router.get("/", getClubs);
router.get("/search", searchClubs);
router.get("/:id", getClubById);
router.get("/:id/highlights", getClubHighlights);

export default router;