import { Router } from "express";
import authRoutes from "./auth";
import storageRoutes from "./storage";
import clubsRoutes from "./clubs";
import clubEventsRoutes from "./club-events";
import guestsRoutes from "./guests";
import playersRoutes from "./player";
import playerApplicationRoutes from "./player-application";
import clubTableRoutes from "./club-table";
import highlightRequestRoutes from "./highlight-requests";
import customPaymentsRouter from "./custom-payments";

const router = Router();

router.use("/auth", authRoutes);
router.use("/storage", storageRoutes);
router.use("/clubs", clubsRoutes);
router.use("/club-events", clubEventsRoutes);
router.use("/guests", guestsRoutes);
router.use("/players", playersRoutes);
router.use("/player-applications", playerApplicationRoutes);
router.use("/club-table", clubTableRoutes);
router.use("/highlight-requests", highlightRequestRoutes);
router.use("/payments", customPaymentsRouter);

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default router;
