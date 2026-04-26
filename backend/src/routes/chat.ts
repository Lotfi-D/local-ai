import { Router, Request, Response } from "express";
import { streamChat, Message } from "../services/chat";
import { getHistory, addMessages } from "../store/sessions";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message || typeof message !== "string") {
    res.status(400).json({ error: "Missing sessionId or message" });
    return;
  }

  const userMessage: Message = { role: "user", content: message };
  const history = getHistory(sessionId);
  const messages = [...history, userMessage];

  console.log(`[chat] session=${sessionId} message=${message}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let assistantReply = "";

  try {
    await streamChat(
      messages,
      (token) => {
        assistantReply += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
      () => {
        addMessages(sessionId, [
          userMessage,
          { role: "assistant", content: assistantReply },
        ]);
        res.write("data: [DONE]\n\n");
      }
    );
  } catch (err) {
    console.error("[chat] error:", err);
    res.write(`data: ${JSON.stringify({ error: "Ollama unreachable" })}\n\n`);
  }

  res.end();
});

export default router;
