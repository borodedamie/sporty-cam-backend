import { Router } from "express";
import authRoutes from "./auth";
import profilesRoutes from "./profiles";
import storageRoutes from "./storage";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profilesRoutes);
router.use("/storage", storageRoutes);

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default router;
