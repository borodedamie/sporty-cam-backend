import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * @openapi
 * /storage/upload:
 *   post:
 *     tags:
 *       - storage
 *     summary: Upload a file to Supabase Storage
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
 *               bucket:
 *                 type: string
 *                 default: public
 *     responses:
 *       200:
 *         description: Upload success
 */
router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    const bucket = (req.body.bucket as string) || "public";
    if (!file) return res.status(400).json({ error: "No file provided" });

    const filePath = `${req.user!.id}/${Date.now()}-${file.originalname}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) return res.status(400).json({ error: error.message });

    // Get a public URL if the bucket is public
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
    res.json({ path: data.path, publicUrl: pub.publicUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
