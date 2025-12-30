import { HTTPFetchError, MessageAPIResponseBase, webhook } from "@line/bot-sdk";
import { Request, Response } from "express";
import lineService from "../services/lineService";
import { ACTION_SELECT_CATEGORY, PostbackData } from "../types/postback";
import { parseExpenseInput } from "../utils/expenseParser";

/**
 * テキストメッセージハンドラー
 * 支払い内容と金額をパースしてカテゴリ選択を表示
 */
const textEventHandler = async (
  event: webhook.Event
): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  if (!event.replyToken) {
    return;
  }

  const messageText = event.message.text.trim();

  // 支払い内容と金額をパース
  const parsed = parseExpenseInput(messageText);

  if (!parsed) {
    // パースできない場合はヘルプメッセージ
    await lineService.replyText(
      event.replyToken,
      "支払い内容と金額を入力してね！\n\n例：\nランチ\n1200\n\nまたは：\nランチ 1200"
    );
    return;
  }

  const { item, amount } = parsed;

  // 金額のバリデーション
  if (amount <= 0 || amount > 1000000) {
    await lineService.replyText(
      event.replyToken,
      "金額は1円〜1,000,000円の範囲で入力してね"
    );
    return;
  }

  // カテゴリ選択表示（item, amountをpostbackに埋め込む）
  await lineService.replyWithCategorySelection(event.replyToken, item, amount);
};

/**
 * Postbackイベントハンドラー
 * カテゴリ選択を処理
 */
const postbackEventHandler = async (
  event: webhook.Event
): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== "postback") {
    return;
  }

  if (!event.replyToken) {
    return;
  }

  try {
    const data: PostbackData = JSON.parse(event.postback.data);

    if (data.action === ACTION_SELECT_CATEGORY) {
      // カテゴリ、支払い内容、金額を取得
      if (!data.category || !data.item || !data.amount) {
        console.error("Missing data in postback", { data });
        await lineService.replyText(event.replyToken, "エラーが発生しました");
        return;
      }

      // コンソールログ出力
      const record = {
        date: new Date(),
        item: data.item,
        category: data.category,
        amount: data.amount,
      };
      console.log("支払い記録:", record);

      // 完了メッセージ送信
      await lineService.replyWithCompletion(
        event.replyToken,
        data.item,
        data.category,
        data.amount
      );
    } else {
      console.error("Unknown postback action:", data.action);
      await lineService.replyText(event.replyToken, "エラーが発生しました");
    }
  } catch (error) {
    console.error("Error parsing postback data", { error, event });
    await lineService.replyText(event.replyToken, "エラーが発生しました");
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const callbackRequest: webhook.CallbackRequest = req.body;
  const events: webhook.Event[] = callbackRequest.events!;

  await Promise.all(
    events.map(async (event: webhook.Event) => {
      try {
        // イベントタイプに応じて処理を振り分け
        if (event.type === "message") {
          await textEventHandler(event);
        } else if (event.type === "postback") {
          await postbackEventHandler(event);
        }
      } catch (err: unknown) {
        if (err instanceof HTTPFetchError) {
          console.error(err.status);
          console.error(err.headers.get("x-line-request-id"));
          console.error(err.body);
        } else if (err instanceof Error) {
          console.error(err);
        }

        return res.status(500).json({
          status: "error",
        });
      }
    })
  );
  res.status(200).json({ message: "ok" });
};
