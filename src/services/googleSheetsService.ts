import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { GaxiosError } from 'gaxios';
import type { sheets_v4 } from 'googleapis';
import { google } from 'googleapis';
import type { ExpenseRecordWithUser, SheetRow } from '../types/sheets';
import logger from '../utils/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

const log = logger.child({ service: 'GoogleSheetsService' });

class GoogleSheetsService {
	private sheets: sheets_v4.Sheets;
	private spreadsheetId: string;
	private sheetId: string;
	private sheetName: string | null = null;

	constructor() {
		// 環境変数の検証
		this.spreadsheetId = process.env.SPREADSHEET_ID || '';
		this.sheetId = process.env.SHEET_ID || '';

		if (!this.spreadsheetId) {
			throw new Error('SPREADSHEET_ID environment variable is required');
		}
		if (!this.sheetId) {
			throw new Error('SHEET_ID environment variable is required');
		}

		// ADC認証の設定
		const auth = new google.auth.GoogleAuth({
			scopes: ['https://www.googleapis.com/auth/spreadsheets'],
		});

		this.sheets = google.sheets({ version: 'v4', auth });

		log.info(
			{
				spreadsheetId: this.spreadsheetId,
				sheetId: this.sheetId,
			},
			'GoogleSheetsService initialized',
		);
	}

	/**
	 * シートIDからシート名を取得して初期化
	 * 初回API呼び出し時に遅延初期化
	 */
	private async ensureSheetName(): Promise<string> {
		if (this.sheetName) {
			return this.sheetName;
		}

		try {
			const response = await this.sheets.spreadsheets.get({
				spreadsheetId: this.spreadsheetId,
			});

			const sheet = response.data.sheets?.find(
				(s) => s.properties?.sheetId?.toString() === this.sheetId,
			);

			if (!sheet) {
				throw new Error(`Sheet with ID ${this.sheetId} not found`);
			}

			this.sheetName = sheet.properties?.title || null;

			if (!this.sheetName) {
				throw new Error(`Sheet title not found for ID ${this.sheetId}`);
			}

			log.info({ sheetId: this.sheetId, sheetName: this.sheetName }, 'Sheet name resolved');

			return this.sheetName;
		} catch (error) {
			log.error({ err: error, sheetId: this.sheetId }, 'Failed to resolve sheet name');
			throw error;
		}
	}

	/**
	 * Google Sheetsに支出記録を追加
	 */
	async appendExpenseRecord(record: ExpenseRecordWithUser): Promise<void> {
		try {
			// シート名を解決（初回のみAPI呼び出し、以降はキャッシュ）
			const sheetName = await this.ensureSheetName();

			// 日付と時刻のフォーマット（日本時間）
			const jstDate = dayjs(record.date).tz('Asia/Tokyo');
			const dateStr = jstDate.format('YYYY-MM-DD'); // YYYY-MM-DD
			const monthStr = jstDate.format('YYYY-MM');

			// 5列のデータ配列を作成
			const values: SheetRow[] = [
				[dateStr, monthStr, record.userId, record.category, record.item, record.amount],
			];

			// スプレッドシートに追加
			await this.sheets.spreadsheets.values.append({
				spreadsheetId: this.spreadsheetId,
				range: `${sheetName}!A:F`,
				valueInputOption: 'USER_ENTERED',
				requestBody: { values },
			});

			log.info({ record }, 'Successfully appended expense record to Google Sheets');
		} catch (error) {
			// Google API固有のエラーハンドリング
			if (error instanceof GaxiosError) {
				log.error(
					{
						err: error,
						status: error.response?.status,
						statusText: error.response?.statusText,
						data: error.response?.data,
					},
					'Google Sheets API error',
				);
			} else if (error instanceof Error) {
				log.error({ err: error }, 'Failed to append expense record');
			}
			throw error; // ハンドラーでユーザー通知
		}
	}
}

export default new GoogleSheetsService();
