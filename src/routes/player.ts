import { Router } from "express";
import {
  getClubsAuthUser,
  getPlayerAuthUser,
  uploadPlayerProfilePhoto,
  createPlayer,
  updatePlayer,
  uploadPlayerId,
  updatePlayerUploadedId,
  updatePlayerProfilePhoto,
  joinClub,
  leaveClub,
} from "../controllers/player";
import { requireAuth } from "../middleware/auth";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/players/me/clubs:
 *   get:
 *     tags:
 *       - players
 *     summary: Get clubs the authenticated user is a member of
 *     description: Returns clubs where the authenticated user is an active member. The endpoint reads the canonical `players` row for the user (by `user_id`) and then queries `player_club_membership` to find club memberships. If no canonical player exists or no memberships are found, an empty list is returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of clubs for the authenticated user
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
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - user token must include a user id
 *       500:
 *         description: Server error
 *
 * /api/players/me:
 *   get:
 *     tags:
 *       - players
 *     summary: Get player for the authenticated user
 *     description: Returns the authenticated user's player (queried by user_id from the access token).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player found
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Player not found
 *       500:
 *         description: Server error
 *
 * /api/players/me/profile-photo:
 *   post:
 *     tags:
 *       - players
 *     summary: Upload player profile photo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload and update success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 url:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 *
 * /api/players/me/upload-id:
 *   post:
 *     tags:
 *       - players
 *     summary: Upload player identification document
 *     description: Uploads an identification document (passport, ID card) to Supabase Storage and updates uploaded_id_url in player_applications.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload and update success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 url:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players/me/profile-photo/update:
 *   post:
 *     tags:
 *       - players
 *     summary: Save profile photo and persist URL
 *     description: Uploads a profile photo to Supabase Storage and saves the generated `profile_photo_url` into the player's `player_applications` row.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 * 
 *     responses:
 *       200:
 *         description: Profile photo saved and player updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Player'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players/me/upload-id/update:
 *   post:
 *     tags:
 *       - players
 *     summary: Save uploaded ID and persist URL
 *     description: Uploads an identification document to Supabase Storage and saves the generated `uploaded_id_url` into the player's `player_applications` row.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploaded ID saved and player updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Player'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players/me/join-club:
 *   post:
 *     tags:
 *       - players
 *     summary: Apply to join a club (creates a player application)
 *     description: Creates a `player_applications` row for the authenticated user for the given `club_id`. If a canonical `players` row exists for the user it will be used to pre-fill application fields (phone, date_of_birth, profile/uploaded ID URLs, jersey name, etc.). If the user is already a member (there is an entry in `player_club_membership`) the endpoint returns 200 with the membership. The endpoint is idempotent and will return existing application if one exists for the same user/email + club.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               club_id:
 *                 type: string
 *                 description: The target club to join
 *             required: [club_id]
 *     responses:
 *       201:
 *         description: Application submitted
 *       200:
 *         description: Already applied or already a member
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players/me/leave-club:
 *   post:
 *     tags:
 *       - players
 *     summary: Leave a club (remove membership)
 *     description: Removes the authenticated user's membership from the specified club. Requires an authenticated user and an existing membership in `player_club_membership`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               club_id:
 *                 type: string
 *                 description: The club id to leave
 *             required: [club_id]
 *     responses:
 *       200:
 *         description: Successfully left club
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Membership or player not found
 *       500:
 *         description: Server error
 *
 * /api/players:
 *   post:
 *     tags:
 *       - players
 *     summary: Create a player entry
 *     description: Inserts a new `players` row using the Player model. Typically used by admins or server-side processes. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Player'
 *     responses:
 *       201:
 *         description: Player created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 *   patch:
 *     tags:
 *       - players
 *     summary: Update player application for the authenticated user
 *     description: Updates the authenticated user's players row. Only approved members can update their information. Uses user_id from auth token for security.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Player'
 *     responses:
 *       200:
 *         description: Player application updated successfully
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
 *                   $ref: '#/components/schemas/Player'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only approved members can update their information
 *       404:
 *         description: Player application not found
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         club_id:
 *           type: string
 *           nullable: true
 *           format: uuid
 *         application_type:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         profile_photo_url:
 *           type: string
 *           nullable: true
 *         identification:
 *           type: string
 *           nullable: true
 *         uploaded_id_url:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *         preferred_training_day:
 *           type: string
 *           nullable: true
 *         time_preference:
 *           type: string
 *           nullable: true
 *         preferred_jersey_name:
 *           type: string
 *           nullable: true
 *         address:
 *           type: string
 *           nullable: true
 *         country:
 *           type: string
 *           nullable: true
 *         state:
 *           type: string
 *           nullable: true
 *         city:
 *           type: string
 *           nullable: true
 *         interested_in:
 *           type: array
 *           items:
 *             type: string
 *         preferred_sport:
 *           type: string
 *           nullable: true
 *         date_of_birth:
 *           type: string
 *           nullable: true
 *         age:
 *           type: number
 *           nullable: true
 *         position:
 *           type: string
 *           nullable: true
 *         phone_number:
 *           type: string
 *           nullable: true
 *         hmo_provider:
 *           type: string
 *           nullable: true
 *         genotype:
 *           type: string
 *           nullable: true
 *         health_concerns:
 *           type: string
 *           nullable: true
 *         emergency_contact_1_name:
 *           type: string
 *           nullable: true
 *         emergency_contact_1_relationship:
 *           type: string
 *           nullable: true
 *         emergency_contact_1_phone:
 *           type: string
 *           nullable: true
 *         emergency_contact_2_name:
 *           type: string
 *           nullable: true
 *         emergency_contact_2_relationship:
 *           type: string
 *           nullable: true
 *         emergency_contact_2_phone:
 *           type: string
 *           nullable: true
 *         referee_in_club:
 *           type: boolean
 *           nullable: true
 *         payment_required:
 *           type: boolean
 *           nullable: true
 *         payment_status:
 *           type: string
 *           nullable: true
 *         social_media_handles:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           nullable: true
 *         motivation_letter:
 *           type: string
 *           nullable: true
 *         previous_club_experience:
 *           type: string
 *           nullable: true
 *         jersey_name:
 *           type: string
 *           nullable: true
 *         profile_visibility:
 *           type: string
 *           nullable: true
 *         default_availability:
 *           type: object
 *           nullable: true
 *         bio:
 *           type: string
 *           nullable: true
 *         passport_document_url:
 *           type: string
 *           nullable: true
 *         profile_picture_url:
 *           type: string
 *           nullable: true
 *         password_hash:
 *           type: string
 *           nullable: true
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         username:
 *           type: string
 *           nullable: true
 *
 */
router.get("/me", requireAuth, getPlayerAuthUser);
router.get("/me/clubs", requireAuth, getClubsAuthUser);
router.post("/me/join-club", requireAuth, joinClub);
router.post("/me/leave-club", requireAuth, leaveClub);
router.post(
  "/me/profile-photo",
  upload.single("file"),
  uploadPlayerProfilePhoto
);
router.post(
  "/me/profile-photo/update",
  requireAuth,
  upload.single("file"),
  updatePlayerProfilePhoto
);
router.post(
  "/me/upload-id",
  requireAuth,
  upload.single("file"),
  uploadPlayerId
);
router.post(
  "/me/upload-id/update",
  requireAuth,
  upload.single("file"),
  updatePlayerUploadedId
);

router.route("/").post(requireAuth, createPlayer).patch(requireAuth, updatePlayer);

export default router;
