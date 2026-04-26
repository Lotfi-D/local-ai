import { Router, Request, Response } from "express";
import multer from "multer";
import { streamGenerateFromFile } from "../services/generate";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing file" });
    return;
  }

  console.log(`[generate] file: ${req.file.originalname}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    await streamGenerateFromFile(
      req.file.path,
      (token) => res.write(`data: ${JSON.stringify({ token })}\n\n`),
      () => res.write("data: [DONE]\n\n")
    );
  } catch (err) {
    console.error("[generate] error:", err);
    res.write(`data: ${JSON.stringify({ error: "Could not process file" })}\n\n`);
  }

  res.end();
});

export default router;
