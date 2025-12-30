import express, { Application, NextFunction, Request, Response } from "express";
import { lineSignature } from "./middlewares/lineSignature";
import { allowedLineUser } from "./middlewares/allowedLineUser";
import { handleWebhook } from "./handlers/webhook";

const app: Application = express();
const port = process.env.PORT || 8080;

// ヘルスチェック
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "ok",
  });
});

// LINE Messaging API の Webhookハンドラ
app.post("/webhook", lineSignature, allowedLineUser, handleWebhook);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// 500
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
