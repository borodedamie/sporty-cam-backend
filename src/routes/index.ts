import { Router } from "express";
import authRoutes from "./auth";
import profilesRoutes from "./profiles";
import storageRoutes from "./storage";
import clubsRoutes from "./clubs";
import guestsRoutes from "./guests";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profilesRoutes);
router.use("/storage", storageRoutes);
router.use("/clubs", clubsRoutes);
router.use("/guests", guestsRoutes);

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default router;
