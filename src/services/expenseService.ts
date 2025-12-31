import type { ExpenseCreateParams } from '../databases/entities/ExpenseEntity';
import expenseRepository, {
	type ExpenseRepository,
} from '../databases/repositories/ExpenseRepository';
import { ExpenseCategory, type ExpenseCategory as ExpenseCategoryType } from '../types/expense';
import { dayjs } from '../utils/datetime';

export class ExpenseService {
	constructor(readonly expenseRepository: ExpenseRepository) {}

	/**
	 * 支払い内容を保存
	 */
	public async record(params: ExpenseCreateParams) {
		return this.expenseRepository.create(params);
	}

	/**
	 * 今月の支払いサマリー取得
	 */
	async getMonthlySummary(userId: string, baseDate: Date) {
		const from = dayjs.tz(baseDate, 'Asia/Tokyo').startOf('month').toDate();
		const to = dayjs.tz(baseDate, 'Asia/Tokyo').endOf('month').toDate();

		const expenses = await this.expenseRepository.findByUserAndDateRange(userId, from, to);

		const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

		return {
			totalAmount,
		};
	}

	/**
	 * カテゴリ別集計を含む詳細な月次サマリー取得
	 */
	async getMonthlySummaryWithDetails(userId: string, baseDate: Date) {
		const from = dayjs.tz(baseDate, 'Asia/Tokyo').startOf('month').toDate();
		const to = dayjs.tz(baseDate, 'Asia/Tokyo').endOf('month').toDate();

		const expenses = await this.expenseRepository.findByUserAndDateRange(userId, from, to);

		// カテゴリ別集計（動的に初期化）
		const categoryTotals = Object.values(ExpenseCategory).reduce(
			(acc, category) => {
				acc[category] = 0;
				return acc;
			},
			{} as Record<ExpenseCategoryType, number>,
		);

		// 各支払いをカテゴリ別に集計
		for (const expense of expenses) {
			categoryTotals[expense.category] += expense.amount;
		}

		const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

		return {
			totalAmount,
			categoryTotals,
			recordCount: expenses.length,
		};
	}
}

export default new ExpenseService(expenseRepository);
