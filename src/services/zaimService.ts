import type { OAuthTempTokenCreateParams } from '../databases/entities/OAuthTempTokenEntity';
import type { ZaimAccountCreateParams } from '../databases/entities/ZaimAccountEntity';
import oAuthTempTokenRepository, {
	type OAuthTempTokenRepository,
} from '../databases/repositories/OAuthTempTokenRepository';
import zaimAccountRepository, {
	type ZaimAccountRepository,
} from '../databases/repositories/ZaimAccountRepository';

import firestoreService from './firestoreService';

export class ZaimService {
	constructor(
		readonly oAuthTempTokenRepository: OAuthTempTokenRepository,
		readonly zaimAccountRepository: ZaimAccountRepository,
	) {}

	/**
	 * リクエストトークンを一時的に保存
	 */
	public async saveRequestToken(params: OAuthTempTokenCreateParams) {
		return firestoreService.runTransaction(async (transaction) => {
			const token = await this.oAuthTempTokenRepository.create(params, transaction);

			return token;
		});
	}

	/**
	 * リクエストトークンの情報を削除
	 */
	async deleteRequestToken(id: string) {
		await this.oAuthTempTokenRepository.delete(id);
	}

	/**
	 * アクセストークンを保存
	 */
	async saveZaimAccount(params: ZaimAccountCreateParams) {
		await zaimAccountRepository.create(params);
	}

	/**
	 * アクセストークンを保存
	 */
	async getZaimAccount(lineUserId: string) {
		return await zaimAccountRepository.findById(lineUserId);
	}
}

export default new ZaimService(oAuthTempTokenRepository, zaimAccountRepository);
