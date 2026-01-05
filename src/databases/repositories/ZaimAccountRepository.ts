import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import firestoreService from '../../services/firestoreService';
import { type ZaimAccountCreateParams, ZaimAccountEntity } from '../entities/ZaimAccountEntity';

export class ZaimAccountRepository {
	constructor(private readonly firestore: Firestore) {}

	private toEntity(id: string, data: FirebaseFirestore.DocumentData): ZaimAccountEntity {
		return new ZaimAccountEntity({
			id,
			lineUserId: data.lineUserId,
			accessToken: data.accessToken,
			accessTokenSecret: data.accessTokenSecret,
			createdAt: data.createdAt.toDate(),
		});
	}

	/**
	 * アクセストークンを保存
	 */
	async create(
		params: ZaimAccountCreateParams,
		transaction?: Transaction,
	): Promise<ZaimAccountEntity> {
		const now = new Date();

		const tokenRef = this.firestore.collection('ZaimAccounts').doc(params.lineUserId);

		const tokenData = {
			accessToken: params.accessToken,
			accessTokenSecret: params.accessTokenSecret,
			lineUserId: params.lineUserId,
			createdAt: Timestamp.fromDate(now),
		};

		if (transaction) {
			transaction.set(tokenRef, tokenData);
		} else {
			await tokenRef.set(tokenData);
		}

		return new ZaimAccountEntity({
			id: tokenRef.id,
			...params,
			createdAt: now,
		});
	}

	async findById(id: string): Promise<ZaimAccountEntity | null> {
		const snap = await this.firestore.collection('ZaimAccounts').doc(id).get();

		if (!snap.exists) {
			return null;
		}

		const data = snap.data();
		if (!data) {
			return null;
		}

		return this.toEntity(snap.id, data);
	}
}

export default new ZaimAccountRepository(firestoreService.firestore());
