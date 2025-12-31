import type { ExpenseCategory } from '../../types/expense';

export interface Expense {
	id: string;
	userId: string;
	category: ExpenseCategory;
	content: string;
	amount: number;
	date: Date;
	createdAt: Date;
	updatedAt: Date;
}

export class ExpenseEntity implements Expense {
	readonly id: string;
	readonly userId: string;
	readonly category: ExpenseCategory;
	readonly content: string;
	readonly amount: number;
	readonly date: Date;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	constructor(params: Expense) {
		this.id = params.id;
		this.userId = params.userId;
		this.category = params.category;
		this.content = params.content;
		this.amount = params.amount;
		this.date = params.date;
		this.createdAt = params.createdAt;
		this.updatedAt = params.updatedAt;
	}
}

export type ExpenseCreateParams = Omit<ExpenseEntity, 'id' | 'createdAt' | 'updatedAt'>;
