import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getAuthenticatedUser,
  loginWithEmailPassword,
  registerWithEmailPassword,
  refreshAccessToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth";

const router = Router();

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - auth
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user
 *
 * /api/auth/login:
 *   post:
 *     tags:
 *       - auth
 *     summary: Login with email and password (Supabase)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login success
 *
 * /api/auth/register:
 *   post:
 *     tags:
 *       - auth
 *     summary: Register with full name, email and password (Supabase)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, confirmPassword]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Account created
 *
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - auth
 *     summary: Refresh access token using refresh token (Supabase)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *
 * /api/auth/change-password:
 *   put:
 *     tags:
 *       - auth
 *     summary: Change the current user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Must be at least 8 chars, include uppercase, lowercase, number and special character
 *               confirmNewPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *
 * /api/auth/request-password-reset:
 *   post:
 *     tags:
 *       - auth
 *     summary: Request a password reset OTP sent to email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - auth
 *     summary: Reset password using the emailed OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp, newPassword, confirmPassword]
 *             properties:
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successfully
 */

router.get("/me", requireAuth, getAuthenticatedUser);
router.post("/login", loginWithEmailPassword);
router.post("/register", registerWithEmailPassword);
router.post("/refresh", refreshAccessToken);
router.put("/change-password", requireAuth, changePassword);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
