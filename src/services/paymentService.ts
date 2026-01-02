import type { PaymentCreateParams } from '../databases/entities/PaymentEntity';
import monthlySummaryRepository, {
	type MonthlySummaryRepository,
} from '../databases/repositories/MonthlySummaryRepository';
import paymentRepository, {
	type PaymentRepository,
} from '../databases/repositories/PaymentRepository';
import { dayjs } from '../utils/datetime';
import firestoreService from './firestoreService';

export class PaymentService {
	constructor(
		readonly paymentRepository: PaymentRepository,
		readonly monthlySummaryRepository: MonthlySummaryRepository,
	) {}

	/**
	 * 支払い内容を保存
	 */
	public async record(params: PaymentCreateParams) {
		return firestoreService.runTransaction(async (transaction) => {
			// 1. Paymentを作成
			const payment = await this.paymentRepository.create(params, transaction);

			// 2. MonthlySummaryを更新
			await this.monthlySummaryRepository.incrementSummary(
				params.userId,
				payment.yearMonth,
				params.category,
				params.amount,
				transaction,
			);

			return payment;
		});
	}

	/**
	 * 今月の支払いサマリー取得
	 */
	async getMonthlySummary(userId: string, baseDate: Date) {
		const yearMonth = dayjs.tz(baseDate, 'Asia/Tokyo').format('YYYY-MM');
		const summary = await this.monthlySummaryRepository.findByYearMonth(userId, yearMonth);

		return {
			totalAmount: summary.totalAmount,
		};
	}

	/**
	 * カテゴリ別集計を含む詳細な月次サマリー取得
	 */
	async getMonthlySummaryWithDetails(userId: string, baseDate: Date) {
		const yearMonth = dayjs.tz(baseDate, 'Asia/Tokyo').format('YYYY-MM');
		const summary = await this.monthlySummaryRepository.findByYearMonth(userId, yearMonth);

		return {
			totalAmount: summary.totalAmount,
			categoryTotals: summary.categoryTotals,
			recordCount: summary.recordCount,
		};
	}

	/**
	 * 今週の支払い一覧を取得（日曜始まり）
	 */
	async getWeekPayments(userId: string, baseDate: Date) {
		// 今週の開始日（日曜 00:00:00）を計算
		const startOfWeek = dayjs.tz(baseDate, 'Asia/Tokyo').startOf('week').toDate();

		// 今週の終了日（土曜 23:59:59）を計算
		const endOfWeek = dayjs.tz(baseDate, 'Asia/Tokyo').endOf('week').toDate();

		// DB側で降順ソート、最新25件に制限
		return await this.paymentRepository.findByUserAndDateRange(userId, startOfWeek, endOfWeek, {
			orderDirection: 'desc',
			limit: 25,
		});
	}

	/**
	 * 支払いを削除（トランザクション処理）
	 */
	async deletePayment(userId: string, paymentId: string) {
		return firestoreService.runTransaction(async (transaction) => {
			// 1. Paymentを削除し、削除前の情報を取得
			const deletedInfo = await this.paymentRepository.delete(userId, paymentId, transaction);

			// 2. MonthlySummaryを減算
			await this.monthlySummaryRepository.decrementSummary(
				userId,
				deletedInfo.yearMonth,
				deletedInfo.category,
				deletedInfo.amount,
				transaction,
			);
		});
	}
}

export default new PaymentService(paymentRepository, monthlySummaryRepository);
