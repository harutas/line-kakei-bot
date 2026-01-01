import type { PaymentCategory } from '../../types/payment';

export interface Payment {
	id: string;
	userId: string;
	category: PaymentCategory;
	content: string;
	amount: number;
	date: Date;
	yearMonth: string;
	createdAt: Date;
	updatedAt: Date;
}

export class PaymentEntity implements Payment {
	readonly id: string;
	readonly userId: string;
	readonly category: PaymentCategory;
	readonly content: string;
	readonly amount: number;
	readonly date: Date;
	readonly yearMonth: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	constructor(params: Payment) {
		this.id = params.id;
		this.userId = params.userId;
		this.category = params.category;
		this.content = params.content;
		this.amount = params.amount;
		this.date = params.date;
		this.yearMonth = params.yearMonth;
		this.createdAt = params.createdAt;
		this.updatedAt = params.updatedAt;
	}
}

export type PaymentCreateParams = Omit<
	PaymentEntity,
	'id' | 'yearMonth' | 'createdAt' | 'updatedAt'
>;
