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
}

export default new PaymentService(paymentRepository, monthlySummaryRepository);
