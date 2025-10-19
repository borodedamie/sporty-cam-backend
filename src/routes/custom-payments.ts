import { Router } from "express";
import { createCustomPayment, getKoraCheckoutConfig, createMembershipRenewal } from "../controllers/payment";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Create a custom payment
 *     description: >
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
 *             fee_id: "PSK_ref_9s0sF9K0"  # Paystack reference here (optional)
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
 *
 * /api/payments/kora-config:
 *   get:
 *     summary: Get Kora checkout configuration
 *     description: Returns a Kora API key (preferably public key) and a unique UUID reference for a transaction.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
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
 *         apiKey:
 *           type: string
 *           description: Kora API key to initialize checkout (use public key).
 *           example: pk_test_xxxxxxxxxxxxxxxxxxxxx
 *         reference:
 *           type: string
 *           description: Unique transaction reference (UUID).
 *           example: "8c2b8f49-9c0f-4d7a-8a5a-0b1b3e9e7a11"
 * 
 *     MembershipRenewal:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         membership_period_id: { type: string, nullable: true }
 *         player_application_id: { type: string }
 *         club_id: { type: string }
 *         due_date: { type: string, format: date-time }
 *         amount_due: { type: number }
 *         receipt_url: { type: string, nullable: true }
 *         admin_confirmed_at: { type: string, format: date-time, nullable: true }
 *         admin_notes: { type: string, nullable: true }
 *         status:
 *           type: string
 *           enum: [pending, confirmed, overdue, rejected]
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *         payment_amount: { type: number, nullable: true }
 *         season_name: { type: string, nullable: true }
 *         season_start_date: { type: string, format: date, nullable: true }
 *         season_end_date: { type: string, format: date, nullable: true }
 *         auto_approved: { type: boolean, nullable: true }
 *     CreateMembershipRenewalInput:
 *       type: object
 *       properties:
 *         membership_period_id: { type: string, nullable: true }
 *         club_id: { type: string }
 *         due_date: { type: string, format: date-time }
 *         amount_due: { type: number }
 *         receipt_url: { type: string, nullable: true }
 *         admin_notes: { type: string, nullable: true }
 *         payment_amount:
 *           type: number
 *           nullable: true
 *           description: Optional manual amount; Paystack verification overrides this when successful.
 *         season_name: { type: string, nullable: true }
 *         season_start_date: { type: string, format: date, nullable: true }
 *         season_end_date: { type: string, format: date, nullable: true }
 *         auto_approved: { type: boolean, nullable: true }
 *         payment_method:
 *           type: string
 *           enum: [paystack, kora]
 *           description: Used for processing; not persisted.
 *         reference:
 *           type: string
 *           description: Paystack reference (when payment_method=paystack) or Kora UUID (from GET /payments/kora-config); not persisted.
 *       required: [club_id, due_date, amount_due]
 */

router.post("/", requireAuth, createCustomPayment);
router.post("/membership-renewals", requireAuth, createMembershipRenewal);
router.get("/kora-config", getKoraCheckoutConfig);

export default router;