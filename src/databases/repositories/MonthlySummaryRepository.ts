import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import firestoreService from '../../services/firestoreService';
import { PaymentCategory, type PaymentCategory as PaymentCategoryType } from '../../types/payment';
import { MonthlySummaryEntity } from '../entities/MonthlySummaryEntity';

export class MonthlySummaryRepository {
	constructor(private readonly firestore: Firestore) {}

	/**
	 * カテゴリ別集計のデフォルト値を動的に生成
	 */
	private getDefaultCategoryTotals(): Record<PaymentCategoryType, number> {
		return Object.values(PaymentCategory).reduce(
			(acc, category) => {
				acc[category] = 0;
				return acc;
			},
			{} as Record<PaymentCategoryType, number>,
		);
	}

	private toEntity(yearMonth: string, data: FirebaseFirestore.DocumentData): MonthlySummaryEntity {
		return new MonthlySummaryEntity({
			yearMonth,
			totalAmount: data.totalAmount || 0,
			categoryTotals: data.categoryTotals || this.getDefaultCategoryTotals(),
			recordCount: data.recordCount || 0,
			lastUpdated: data.lastUpdated?.toDate() || new Date(),
		});
	}

	/**
	 * 指定月の集計を取得
	 */
	async findByYearMonth(userId: string, yearMonth: string): Promise<MonthlySummaryEntity> {
		const summaryDoc = await this.firestore
			.collection('Users')
			.doc(userId)
			.collection('MonthlySummaries')
			.doc(yearMonth)
			.get();

		if (!summaryDoc.exists) {
			// データが存在しない場合はデフォルト値を返す
			return new MonthlySummaryEntity({
				yearMonth,
				totalAmount: 0,
				categoryTotals: this.getDefaultCategoryTotals(),
				recordCount: 0,
				lastUpdated: new Date(),
			});
		}

		const data = summaryDoc.data();
		if (!data) {
			// データが空の場合もデフォルト値を返す
			return new MonthlySummaryEntity({
				yearMonth,
				totalAmount: 0,
				categoryTotals: this.getDefaultCategoryTotals(),
				recordCount: 0,
				lastUpdated: new Date(),
			});
		}

		return this.toEntity(yearMonth, data);
	}

	/**
	 * 月次集計を加算
	 */
	async incrementSummary(
		userId: string,
		yearMonth: string,
		category: PaymentCategoryType,
		amount: number,
		transaction?: Transaction,
	): Promise<void> {
		const summaryRef = this.firestore
			.collection('Users')
			.doc(userId)
			.collection('MonthlySummaries')
			.doc(yearMonth);

		const updateData = {
			totalAmount: FieldValue.increment(amount),
			categoryTotals: {
				[category]: FieldValue.increment(amount),
			},
			recordCount: FieldValue.increment(1),
			lastUpdated: Timestamp.now(),
		};

		if (transaction) {
			transaction.set(summaryRef, updateData, { merge: true });
		} else {
			await summaryRef.set(updateData, { merge: true });
		}
	}

	/**
	 * 月次集計を減算（削除時用）
	 */
	async decrementSummary(
		userId: string,
		yearMonth: string,
		category: PaymentCategoryType,
		amount: number,
		transaction?: Transaction,
	): Promise<void> {
		const summaryRef = this.firestore
			.collection('Users')
			.doc(userId)
			.collection('MonthlySummaries')
			.doc(yearMonth);

		const updateData = {
			totalAmount: FieldValue.increment(-amount),
			categoryTotals: {
				[category]: FieldValue.increment(-amount),
			},
			recordCount: FieldValue.increment(-1),
			lastUpdated: Timestamp.now(),
		};

		if (transaction) {
			transaction.set(summaryRef, updateData, { merge: true });
		} else {
			await summaryRef.set(updateData, { merge: true });
		}
	}
}

export default new MonthlySummaryRepository(firestoreService.firestore());
