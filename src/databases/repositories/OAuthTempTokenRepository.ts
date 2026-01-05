import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import firestoreService from '../../services/firestoreService';
import {
	type OAuthTempTokenCreateParams,
	OAuthTempTokenEntity,
} from '../entities/OAuthTempTokenEntity';

export class OAuthTempTokenRepository {
	constructor(private readonly firestore: Firestore) {}

	private toEntity(id: string, data: FirebaseFirestore.DocumentData): OAuthTempTokenEntity {
		return new OAuthTempTokenEntity({
			id,
			oauthToken: data.oauthToken,
			oauthTokenSecret: data.oauthTokenSecret,
			lineUserId: data.lineUserId,
			expiresAt: data.expiresAt.toDate(),
		});
	}

	/**
	 * リクエストトークンを一時的に保存
	 */
	async create(
		params: OAuthTempTokenCreateParams,
		transaction?: Transaction,
	): Promise<OAuthTempTokenEntity> {
		const tokenRef = this.firestore.collection('OAuthTempTokens').doc(params.oauthToken);

		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		const tokenData = {
			oauthToken: params.oauthToken,
			oauthTokenSecret: params.oauthTokenSecret,
			lineUserId: params.lineUserId,
			expiresAt: Timestamp.fromDate(
				expiresAt, // 10分
			),
		};

		if (transaction) {
			transaction.set(tokenRef, tokenData);
		} else {
			await tokenRef.set(tokenData);
		}

		return new OAuthTempTokenEntity({
			id: tokenRef.id,
			...params,
			expiresAt,
		});
	}

	async findById(id: string): Promise<OAuthTempTokenEntity | null> {
		const snap = await this.firestore.collection('OAuthTempTokens').doc(id).get();

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
	 * 削除
	 */
	async delete(id: string, transaction?: Transaction): Promise<void> {
		const tokenRef = this.firestore.collection('OAuthTempTokens').doc(id);

		let tokenDoc: FirebaseFirestore.DocumentData;

		if (transaction) {
			tokenDoc = await transaction.get(tokenRef);
		} else {
			tokenDoc = await tokenRef.get();
		}

		if (!tokenDoc.exists) {
			throw new Error('Token not found');
		}

		if (transaction) {
			transaction.delete(tokenRef);
		} else {
			await tokenRef.delete();
		}
	}
}

export default new OAuthTempTokenRepository(firestoreService.firestore());
