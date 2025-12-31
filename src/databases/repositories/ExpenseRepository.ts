import { type CollectionReference, type Firestore, Timestamp } from 'firebase-admin/firestore';
import firestoreService from '../../services/firestoreService';
import { type ExpenseCreateParams, ExpenseEntity } from '../entities/ExpenseEntity';

export class ExpenseRepository {
	private readonly collection: CollectionReference;

	constructor(private readonly firestore: Firestore) {
		this.collection = this.firestore.collection('Expenses');
	}

	private toEntity(id: string, data: FirebaseFirestore.DocumentData): ExpenseEntity {
		return new ExpenseEntity({
			id,
			userId: data.userId,
			date: data.date.toDate(),
			category: data.category,
			content: data.content,
			amount: data.amount,
			createdAt: data.createdAt.toDate(),
			updatedAt: data.updatedAt.toDate(),
		});
	}

	async create(params: ExpenseCreateParams): Promise<ExpenseEntity> {
		const now = new Date();
		const docRef = this.collection.doc();

		const data = {
			...params,
			date: Timestamp.fromDate(params.date),
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
		};

		await docRef.set(data);

		return new ExpenseEntity({
			id: docRef.id,
			...params,
			createdAt: now,
			updatedAt: now,
		});
	}

	async findById(id: string): Promise<ExpenseEntity | null> {
		const snap = await this.collection.doc(id).get();
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
	async findByUserAndDateRange(userId: string, from: Date, to: Date): Promise<ExpenseEntity[]> {
		const snapshot = await this.collection
			.where('userId', '==', userId)
			.where('date', '>=', Timestamp.fromDate(from))
			.where('date', '<=', Timestamp.fromDate(to))
			.orderBy('date', 'asc')
			.get();

		return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
	}

	/**
	 * 削除
	 */
	async delete(id: string): Promise<void> {
		await this.collection.doc(id).delete();
	}
}

export default new ExpenseRepository(firestoreService.firestore());
