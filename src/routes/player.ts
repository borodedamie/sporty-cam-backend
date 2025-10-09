import { Router } from "express";
import {
  getClubsAuthUser,
  getPlayerAuthUser,
  uploadPlayerProfilePhoto,
  createPlayerApplication,
  updatePlayerApplication,
  uploadPlayerId,
  updatePlayerUploadedId,
  updatePlayerProfilePhoto,
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
 *     summary: Get clubs for the authenticated user
 *     description: Returns all clubs associated with the authenticated user via players.user_id and player_applications.user_id.
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
 *                 data:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players/me:
 *   get:
 *     tags:
 *       - players
 *     summary: Get player application for the authenticated user
 *     description: Returns the authenticated user's player application (queried by user_id from the access token).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player application found
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
 *         description: Player application not found
 *       500:
 *         description: Server error
 *
 * /api/players/me/profile-photo:
 *   post:
 *     tags:
 *       - players
 *     summary: Upload player profile photo
 *     description: Uploads a profile photo to Supabase Storage and updates profile_photo_url in player_applications.
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
 *     responses:
 *       200:
 *         description: Profile photo saved and player application updated
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
 *                   $ref: '#/components/schemas/PlayerApplication'
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
 *         description: Uploaded ID saved and player application updated
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
 *                   $ref: '#/components/schemas/PlayerApplication'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/players:
 *   post:
 *     tags:
 *       - players
 *     summary: Create a player application for the authenticated user
 *     description: Inserts a new `player_applications` row for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlayerApplication'
 *     responses:
 *       201:
 *         description: Player application created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 *   patch:
 *     tags:
 *       - players
 *     summary: Update player application for the authenticated user
 *     description: Updates the authenticated user's player_applications row. Only approved members can update their information. Uses user_id from auth token for security.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlayerApplication'
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
 *                   $ref: '#/components/schemas/PlayerApplication'
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
 *     PlayerApplication:
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
 *         full_name:
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

router
  .route("/")
  .post(requireAuth, createPlayerApplication)
  .patch(requireAuth, updatePlayerApplication);

export default router;
