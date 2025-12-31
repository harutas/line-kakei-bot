import type { ExpenseCreateParams } from '../databases/entities/ExpenseEntity';
import expenseRepository, {
	type ExpenseRepository,
} from '../databases/repositories/ExpenseRepository';
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
}

export default new ExpenseService(expenseRepository);
