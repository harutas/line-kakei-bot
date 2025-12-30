import {
  ClientConfig,
  MessageAPIResponseBase,
  messagingApi,
  TextMessage,
  QuickReply,
  QuickReplyItem,
} from "@line/bot-sdk";
import { ACTION_SELECT_CATEGORY, PostbackData } from "../types/postback";
import { ExpenseCategory, toExpenseCategoryLabel } from "../types/expense";

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
};

class LineService {
  private client: messagingApi.MessagingApiClient;

  constructor() {
    this.client = new messagingApi.MessagingApiClient(clientConfig);
  }

  /**
   * テキストメッセージを返信
   * @param replyToken - 返信トークン
   * @param text - 送信するテキスト
   */
  async replyText(
    replyToken: string,
    text: string
  ): Promise<MessageAPIResponseBase | void> {
    try {
      const message: TextMessage = {
        type: "text",
        text,
      };

      await this.client.replyMessage({
        replyToken,
        messages: [message],
      });
    } catch (error) {
      console.error({ error, replyToken }, "Failed to send text message");
      throw error;
    }
  }

  /**
   * カテゴリ選択のQuick Replyを送信
   * @param replyToken - 返信トークン
   * @param item - 支払い内容
   * @param amount - 金額
   */
  async replyWithCategorySelection(
    replyToken: string,
    item: string,
    amount: number
  ): Promise<MessageAPIResponseBase | void> {
    try {
      const quickReplyItems: QuickReplyItem[] = Object.values(
        ExpenseCategory
      ).map((category) => {
        const data: PostbackData = {
          action: ACTION_SELECT_CATEGORY,
          item,
          amount,
          category,
        };
        return {
          type: "action",
          action: {
            type: "postback",
            label: toExpenseCategoryLabel(category),
            data: JSON.stringify(data),
          },
        };
      });

      const quickReply: QuickReply = {
        items: quickReplyItems,
      };

      const message: TextMessage = {
        type: "text",
        text: `「${item}」で${amount.toLocaleString()}円だね。\nカテゴリを選んでね！`,
        quickReply,
      };

      await this.client.replyMessage({
        replyToken,
        messages: [message],
      });
    } catch (error) {
      console.error({ error, replyToken }, "Failed to send category selection");
      throw error;
    }
  }

  /**
   * 記録完了メッセージを送信
   * @param replyToken - 返信トークン
   * @param item - 支払い内容
   * @param category - カテゴリ
   * @param amount - 金額
   */
  async replyWithCompletion(
    replyToken: string,
    item: string,
    category: ExpenseCategory,
    amount: number
  ): Promise<MessageAPIResponseBase | void> {
    try {
      const message: TextMessage = {
        type: "text",
        text: `記録したよ！\n${toExpenseCategoryLabel(
          category
        )}： ${item} ${amount.toLocaleString()}円`,
      };

      await this.client.replyMessage({
        replyToken,
        messages: [message],
      });
    } catch (error) {
      console.error({ error, replyToken }, "Failed to send completion message");
      throw error;
    }
  }
}

export default new LineService();
