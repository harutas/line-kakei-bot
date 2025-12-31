/**
 * 金額の文字列を整形
 * カンマや「円」を除去して数値に変換
 * @param text - 金額の文字列（例: "1,200円", "1200", "1,200"）
 * @returns 整形された数値、または null
 */
export const cleanAmount = (text: string): number | null => {
	// カンマと「円」を除去
	const cleaned = text.replace(/,/g, '').replace(/円/g, '').trim();

	// 数字のみチェック
	if (!/^\d+$/.test(cleaned)) {
		return null;
	}

	const amount = parseInt(cleaned, 10);

	if (Number.isNaN(amount)) {
		return null;
	}

	return amount;
};

/**
 * テキストから支払い内容と金額をパース
 * @param text - 入力テキスト
 * @returns {content, amount} または null
 */
export const parseExpenseInput = (text: string): { content: string; amount: number } | null => {
	const trimmedText = text.trim();

	// 形式1: 改行区切り（1行目: 支払い内容、2行目: 金額）
	if (trimmedText.includes('\n')) {
		const lines = trimmedText.split('\n');
		if (lines.length >= 2) {
			const content = lines[0].trim();
			const amountText = lines[1].trim();
			const amount = cleanAmount(amountText);

			if (content && amount !== null) {
				return { content, amount };
			}
		}
	}

	// 形式2: スペース区切り（最後の要素を金額として扱う）
	const parts = trimmedText.split(/\s+/);
	if (parts.length >= 2) {
		const amountText = parts[parts.length - 1];
		const amount = cleanAmount(amountText);

		if (amount !== null) {
			const content = parts.slice(0, -1).join(' ').trim();
			if (content) {
				return { content, amount };
			}
		}
	}

	return null;
};
