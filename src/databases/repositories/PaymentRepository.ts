import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import firestoreService from '../../services/firestoreService';
import type { PaymentCategory } from '../../types/payment';
import { dayjs } from '../../utils/datetime';
import { type PaymentCreateParams, PaymentEntity } from '../entities/PaymentEntity';

export class PaymentRepository {
	constructor(private readonly firestore: Firestore) {}

	private toEntity(id: string, data: FirebaseFirestore.DocumentData): PaymentEntity {
		return new PaymentEntity({
			id,
			userId: data.userId,
			date: data.date.toDate(),
			yearMonth: data.yearMonth,
			category: data.category,
			content: data.content,
			amount: data.amount,
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate(),
		});
	}

	/**
	 * 支払いを作成
	 */
	async create(params: PaymentCreateParams, transaction?: Transaction): Promise<PaymentEntity> {
		const now = new Date();
		const yearMonth = dayjs.tz(params.date, 'Asia/Tokyo').format('YYYY-MM');

		const paymentRef = this.firestore
			.collection('Users')
			.doc(params.userId)
			.collection('Payments')
			.doc();

		const paymentData = {
			userId: params.userId,
			date: Timestamp.fromDate(params.date),
			yearMonth,
			category: params.category,
			content: params.content,
			amount: params.amount,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
		};

		if (transaction) {
			transaction.set(paymentRef, paymentData);
		} else {
			await paymentRef.set(paymentData);
		}

		return new PaymentEntity({
			id: paymentRef.id,
			...params,
			yearMonth,
			createdAt: now,
			updatedAt: now,
		});
	}

	async findById(userId: string, id: string): Promise<PaymentEntity | null> {
		const snap = await this.firestore
			.collection('Users')
			.doc(userId)
			.collection('Payments')
			.doc(id)
			.get();

		if (!snap.exists) {
			return null;
		}

		const data = snap.data();
		if (!data) {
			return null;
		}

		return this.toEntity(snap.id, data);
	}

	/**
	 * ユーザー＋期間検索
	 */
	async findByUserAndDateRange(
		userId: string,
		from: Date,
		to: Date,
		options?: {
			orderDirection?: 'asc' | 'desc';
			limit?: number;
		},
	): Promise<PaymentEntity[]> {
		const fromYearMonth = dayjs.tz(from, 'Asia/Tokyo').format('YYYY-MM');
		const toYearMonth = dayjs.tz(to, 'Asia/Tokyo').format('YYYY-MM');
		const orderDirection = options?.orderDirection ?? 'asc';

		let query = this.firestore
			.collection('Users')
			.doc(userId)
			.collection('Payments')
			.where('yearMonth', '>=', fromYearMonth)
			.where('yearMonth', '<=', toYearMonth)
			.orderBy('yearMonth', orderDirection)
			.orderBy('date', orderDirection);

		if (options?.limit) {
			query = query.limit(options.limit);
		}

		const snapshot = await query.get();

		return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
	}

	/**
	 * 削除
	 */
	async delete(
		userId: string,
		id: string,
		transaction?: Transaction,
	): Promise<{ amount: number; category: PaymentCategory; yearMonth: string }> {
		const paymentRef = this.firestore
			.collection('Users')
			.doc(userId)
			.collection('Payments')
			.doc(id);

		let paymentDoc: FirebaseFirestore.DocumentData;

		if (transaction) {
			paymentDoc = await transaction.get(paymentRef);
		} else {
			paymentDoc = await paymentRef.get();
		}

		if (!paymentDoc.exists) {
			throw new Error('Payment not found');
		}

		const data = paymentDoc.data();
		if (!data) {
			throw new Error('Payment data is empty');
		}

		const { amount, category, yearMonth } = data;

		if (transaction) {
			transaction.delete(paymentRef);
		} else {
			await paymentRef.delete();
		}

		return { amount, category, yearMonth };
	}
}

export default new PaymentRepository(firestoreService.firestore());
