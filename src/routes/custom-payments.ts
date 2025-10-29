import { Router } from "express";
import {
  createCustomPayment,
  getKoraCheckoutConfig,
  createMembershipRenewal,
  createGuestFeePayment,
  getPaymentsByClubAndCategory,
} from "../controllers/payment";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Create a custom payment
 *     description:
 *       Creates a custom payment record for the authenticated user.
 *       The user_id is taken from the token. The latest player_application_id for the user is used.
 *       If fee_id is a Paystack reference, it will be verified and the payment marked confirmed.
 *       Otherwise, status remains pending. If fee_id is omitted, one is generated from fee_name.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomPaymentInput'
 *           example:
 *             club_id: "club_123"
 *             fee_name: "Registration Fee"
 *             amount_due: 5000
 *             fee_id: "PSK_ref_9s0sF9K0"
 *             payment_method: "paystack"
 *             receipt_url: null
 *             payment_notes: "Paid via web"
 *             admin_notes: null
 *             due_date: "2025-10-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Payment created
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
 *                   $ref: '#/components/schemas/CustomPayment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   get:
 *     summary: Get payments by club and category
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: club_id
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional club filter; when omitted, returns payments across all the user's clubs
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [membership_renewal, custom_fee, all]
 *         required: false
 *         description: "Payment category to filter (default: all)"
 *     responses:
 *       200:
 *         description: List of payments with club info and payment date/time
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
 *                     properties:
 *                       source:
 *                         type: string
 *                       id:
 *                         type: string
 *                       player_application_id:
 *                         type: string
 *                         nullable: true
 *                       fee_id:
 *                         type: string
 *                         nullable: true
 *                       fee_name:
 *                         type: string
 *                         nullable: true
 *                       payment_reference:
 *                         type: string
 *                         nullable: true
 *                       payment_method:
 *                         type: string
 *                         nullable: true
 *                       amount_due:
 *                         type: number
 *                         nullable: true
 *                       amount_paid:
 *                         type: number
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         nullable: true
 *                       receipt_url:
 *                         type: string
 *                         nullable: true
 *                       admin_notes:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       payment_date:
 *                         type: string
 *                         nullable: true
 *                       payment_time:
 *                         type: string
 *                         nullable: true
 *                       club_name:
 *                         type: string
 *                         nullable: true
 *                       sport:
 *                         type: string
 *                         nullable: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/payments/kora-config:
 *   get:
 *     summary: Get Kora checkout configuration
 *     description: Returns a Kora API key (preferably public key) and a unique UUID reference for a transaction.
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Configuration returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/KoraCheckoutConfig'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/payments/membership-renewals:
 *   post:
 *     summary: Create a membership renewal
 *     description: >
 *       Creates a membership renewal for the authenticated user. Uses the latest player_application_id for the user.
 *       If payment_method is "paystack", provide a Paystack transaction reference in `reference`; backend verifies and confirms on success.
 *       If payment_method is "kora", no verification is done and status remains "pending" (pass the UUID `reference` from GET /payments/kora-config).
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMembershipRenewalInput'
 *           examples:
 *             kora:
 *               summary: Kora checkout (stays pending)
 *               value:
 *                 club_id: "club_123"
 *                 due_date: "2025-10-31T23:59:59Z"
 *                 amount_due: 15000
 *                 payment_method: "kora"
 *                 reference: "8c2b8f49-9c0f-4d7a-8a5a-0b1b3e9e7a11"
 *                 season_name: "2025/2026"
 *             paystack:
 *               summary: Paystack (verified and confirmed on success)
 *               value:
 *                 club_id: "club_123"
 *                 due_date: "2025-10-31T23:59:59Z"
 *                 amount_due: 15000
 *                 payment_method: "paystack"
 *                 reference: "PSK_ref_9s0sF9K0"
 *     responses:
 *       201:
 *         description: Membership renewal created
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
 *                   $ref: '#/components/schemas/MembershipRenewal'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /api/payments/guest-fee-payments:
 *   post:
 *     summary: Create a guest fee payment (public)
 *     description: >
 *       Records a guest fee payment. For Paystack, pass the Paystack transaction reference in payment_reference and it will be verified.
 *       For Kora, pass the UUID reference in payment_reference and provide amount; no verification is done.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_reference:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [paystack, kora]
 *               amount:
 *                 type: number
 *                 description: Required for Kora
 *               club_id:
 *                 type: string
 *               player_application_id:
 *                 type: string
 *             required: [payment_reference, payment_method, club_id, player_application_id]
 *           examples:
 *             paystack:
 *               value:
 *                 payment_reference: "PSK_ref_9s0sF9K0"
 *                 payment_method: "paystack"
 *                 club_id: "club_123"
 *                 player_application_id: "player_app_456"
 *             kora:
 *               value:
 *                 payment_reference: "8c2b8f49-9c0f-4d7a-8a5a-0b1b3e9e7a11"
 *                 payment_method: "kora"
 *                 amount: 5000
 *                 club_id: "club_123"
 *                 player_application_id: "player_app_456"
 *     responses:
 *       201:
 *         description: Guest fee payment recorded
 *       400:
 *         description: Bad request or verification failed
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     CustomPayment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         club_id:
 *           type: string
 *         player_application_id:
 *           type: string
 *         fee_id:
 *           type: string
 *           description: Unique identifier for the fee. When using Paystack, pass the transaction reference here.
 *         fee_name:
 *           type: string
 *         amount_due:
 *           type: number
 *         amount_paid:
 *           type: number
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, confirmed, overdue, rejected]
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         receipt_url:
 *           type: string
 *           nullable: true
 *         payment_notes:
 *           type: string
 *           nullable: true
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         admin_confirmed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         admin_confirmed_by:
 *           type: string
 *           nullable: true
 *         payment_method:
 *           type: string
 *           nullable: true
 *     CreateCustomPaymentInput:
 *       type: object
 *       properties:
 *         club_id:
 *           type: string
 *         fee_name:
 *           type: string
 *         amount_due:
 *           type: number
 *         amount_paid:
 *           type: number
 *           nullable: true
 *           description: Optional manual amount paid; will be overridden if fee_id is a valid Paystack reference.
 *         fee_id:
 *           type: string
 *           description: >
 *             Optional. When using Paystack, pass the Paystack transaction reference here.
 *             If omitted, the backend will generate one from fee_name.
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         receipt_url:
 *           type: string
 *           nullable: true
 *         payment_notes:
 *           type: string
 *           nullable: true
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         payment_method:
 *           type: string
 *           nullable: true
 *       required:
 *         - club_id
 *         - fee_name
 *         - amount_due
 *
 *     KoraCheckoutConfig:
 *       type: object
 *       properties:
 *         publicKey:
 *           type: string
 *           description: Kora API key to initialize checkout (use public key).
 *           example: pk_test_xxxxxxxxxxxxxxxxxxxxx
 *         secretKey:
 *           type: string
 *           description: Kora API secret key (use secret key).
 *           example: sk_test_xxxxxxxxxxxxxxxxxxxxx
 *         encryptionKey:
 *           type: string
 *           description: Kora API encryption key (use encryption key).
 *           example: rLuwXt8wVA89paTapjmaZRyEZLFNZwmX
 *         reference:
 *           type: string
 *           description: Unique transaction reference (UUID).
 *           example: "8c2b8f49-9c0f-4d7a-8a5a-0b1b3e9e7a11"
 *
 *     MembershipRenewal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         membership_period_id:
 *           type: string
 *           nullable: true
 *         player_application_id:
 *           type: string
 *         club_id:
 *           type: string
 *         due_date:
 *           type: string
 *           format: date-time
 *         amount_due:
 *           type: number
 *         receipt_url:
 *           type: string
 *           nullable: true
 *         admin_confirmed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, confirmed, overdue, rejected]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         payment_amount:
 *           type: number
 *           nullable: true
 *         season_name:
 *           type: string
 *           nullable: true
 *         season_start_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         season_end_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         auto_approved:
 *           type: boolean
 *           nullable: true
 *     CreateMembershipRenewalInput:
 *       type: object
 *       properties:
 *         membership_period_id:
 *           type: string
 *           nullable: true
 *         club_id:
 *           type: string
 *         due_date:
 *           type: string
 *           format: date-time
 *         amount_due:
 *           type: number
 *         receipt_url:
 *           type: string
 *           nullable: true
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         payment_amount:
 *           type: number
 *           nullable: true
 *           description: Optional manual amount; Paystack verification overrides this when successful.
 *         season_name:
 *           type: string
 *           nullable: true
 *         season_start_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         season_end_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         auto_approved:
 *           type: boolean
 *           nullable: true
 *         payment_method:
 *           type: string
 *           enum: [paystack, kora]
 *           description: Used for processing; not persisted.
 *         reference:
 *           type: string
 *           description: Paystack reference (when payment_method=paystack) or Kora UUID (from GET /payments/kora-config); not persisted.
 *       required: [club_id, due_date, amount_due]
 */

router
  .route("/")
  .get(requireAuth, getPaymentsByClubAndCategory)
  .post(requireAuth, createCustomPayment);
router.post("/membership-renewals", requireAuth, createMembershipRenewal);
router.post("/guest-fee-payments", createGuestFeePayment);
router.get("/kora-config", getKoraCheckoutConfig);

export default router;