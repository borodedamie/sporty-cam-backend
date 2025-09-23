import { Router } from "express";
import authRoutes from "./auth";
import storageRoutes from "./storage";
import clubsRoutes from "./clubs";
import clubEventsRoutes from "./club-events";
import guestsRoutes from "./guests";
import playersRoutes from "./player";

const router = Router();

router.use("/auth", authRoutes);
router.use("/storage", storageRoutes);
router.use("/clubs", clubsRoutes);
router.use("/club-events", clubEventsRoutes);
router.use("/guests", guestsRoutes);
router.use("/players", playersRoutes);

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default router;
