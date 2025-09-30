import { Router } from "express";
import { getClubPlayersStats } from "../controllers/club-table";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/club-table/{clubId}/players-stats:
 *   get:
 *     summary: Get club players statistics
 *     description: Retrieve comprehensive statistics for all approved players in a club, including season stats and weekly performance data. Players are sorted by total weekly score in descending order.
 *     tags: [Club Table]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the club
 *         example: "club-123"
 *     responses:
 *       200:
 *         description: Club players statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClubPlayersStatsResponse'
 *             examples:
 *               success:
 *                 summary: Successful response with player stats
 *                 value:
 *                   status: success
 *                   message: "Club players stats fetched successfully"
 *                   data:
 *                     clubId: "club-123"
 *                     currentSeason: "2024 Spring Season"
 *                     players:
 *                       - id: "123e4567-e89b-12d3-a456-426614174000"
 *                         name: "John Doe"
 *                         position: "Forward"
 *                         goals: 15
 *                         assists: 8
 *                         yellowCards: 2
 *                         redCards: 0
 *                         appearances: 22
 *                         points: 185
 *                         weeklyPoints:
 *                           week1: 8
 *                           week2: 12
 *                           week3: 6
 *                           week4: 15
 *                           week5: 9
 *                           week6: 11
 *                           week7: 7
 *                           week8: 13
 *                           week9: 10
 *                           week10: 14
 *                           week11: 5
 *                           week12: 8
 *                         totalWeeklyScore: 118
 *                       - id: "456e7890-e89b-12d3-a456-426614174001"
 *                         name: "Jane Smith"
 *                         position: "Midfielder"
 *                         goals: 8
 *                         assists: 12
 *                         yellowCards: 1
 *                         redCards: 0
 *                         appearances: 20
 *                         points: 160
 *                         weeklyPoints:
 *                           week1: 10
 *                           week2: 8
 *                           week3: 12
 *                           week4: 9
 *                           week5: 11
 *                           week6: 7
 *                           week7: 13
 *                           week8: 6
 *                           week9: 14
 *                           week10: 8
 *                           week11: 12
 *                           week12: 5
 *                         totalWeeklyScore: 115
 *                     totalPlayers: 25
 *       400:
 *         description: Bad request - missing or invalid club ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: "Club ID is required"
 *             examples:
 *               missing_club_id:
 *                 summary: Missing club ID
 *                 value:
 *                   status: failed
 *                   message: "Club ID is required"
 *               database_error:
 *                 summary: Database query error
 *                 value:
 *                   status: failed
 *                   message: "Database query failed"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: Club not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: "Club not found"
 *             examples:
 *               club_not_found:
 *                 summary: Club does not exist
 *                 value:
 *                   status: failed
 *                   message: "Club not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: failed
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 *
 * components:
 *   schemas:
 *     WeeklyPoints:
 *       type: object
 *       properties:
 *         week1:
 *           type: number
 *           description: Points scored in week 1
 *           example: 8
 *         week2:
 *           type: number
 *           description: Points scored in week 2
 *           example: 12
 *         week3:
 *           type: number
 *           description: Points scored in week 3
 *           example: 6
 *         week4:
 *           type: number
 *           description: Points scored in week 4
 *           example: 15
 *         week5:
 *           type: number
 *           description: Points scored in week 5
 *           example: 9
 *         week6:
 *           type: number
 *           description: Points scored in week 6
 *           example: 11
 *         week7:
 *           type: number
 *           description: Points scored in week 7
 *           example: 7
 *         week8:
 *           type: number
 *           description: Points scored in week 8
 *           example: 13
 *         week9:
 *           type: number
 *           description: Points scored in week 9
 *           example: 10
 *         week10:
 *           type: number
 *           description: Points scored in week 10
 *           example: 14
 *         week11:
 *           type: number
 *           description: Points scored in week 11
 *           example: 5
 *         week12:
 *           type: number
 *           description: Points scored in week 12
 *           example: 8
 *     
 *     PlayerStatsDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Player application ID
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: Full name of the player
 *           example: "John Doe"
 *         position:
 *           type: string
 *           description: Player's position on the field
 *           example: "Forward"
 *         goals:
 *           type: number
 *           description: Total goals scored this season
 *           example: 15
 *         assists:
 *           type: number
 *           description: Total assists this season
 *           example: 8
 *         yellowCards:
 *           type: number
 *           description: Total yellow cards received this season
 *           example: 2
 *         redCards:
 *           type: number
 *           description: Total red cards received this season
 *           example: 0
 *         appearances:
 *           type: number
 *           description: Total appearances this season
 *           example: 22
 *         points:
 *           type: number
 *           description: Total season points
 *           example: 185
 *         weeklyPoints:
 *           $ref: '#/components/schemas/WeeklyPoints'
 *         totalWeeklyScore:
 *           type: number
 *           description: Sum of all weekly points
 *           example: 118
 *     
 *     ClubPlayersStatsData:
 *       type: object
 *       properties:
 *         clubId:
 *           type: string
 *           description: ID of the club
 *           example: "club-123"
 *         currentSeason:
 *           type: string
 *           description: Name of the current season
 *           example: "2024 Spring Season"
 *         players:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlayerStatsDetails'
 *           description: Array of player statistics, sorted by total weekly score
 *         totalPlayers:
 *           type: number
 *           description: Total number of players in the club
 *           example: 25
 *     
 *     ClubPlayersStatsResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         message:
 *           type: string
 *           example: "Club players stats fetched successfully"
 *         data:
 *           $ref: '#/components/schemas/ClubPlayersStatsData'
 */

router.get("/:clubId/players-stats", requireAuth, getClubPlayersStats);

export default router;
