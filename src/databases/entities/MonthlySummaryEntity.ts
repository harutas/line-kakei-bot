import type { PaymentCategory as PaymentCategoryType } from '../../types/payment';

export interface MonthlySummary {
	yearMonth: string;
	totalAmount: number;
	categoryTotals: Record<PaymentCategoryType, number>;
	recordCount: number;
	lastUpdated: Date;
}

export class MonthlySummaryEntity implements MonthlySummary {
	readonly yearMonth: string;
	readonly totalAmount: number;
	readonly categoryTotals: Record<PaymentCategoryType, number>;
	readonly recordCount: number;
	readonly lastUpdated: Date;

	constructor(params: MonthlySummary) {
		this.yearMonth = params.yearMonth;
		this.totalAmount = params.totalAmount;
		this.categoryTotals = params.categoryTotals;
		this.recordCount = params.recordCount;
		this.lastUpdated = params.lastUpdated;
	}
}
