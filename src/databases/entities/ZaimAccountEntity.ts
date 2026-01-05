export interface ZaimAccount {
	id: string;
	lineUserId: string;
	accessToken: string;
	accessTokenSecret: string;
	createdAt: Date;
}

export class ZaimAccountEntity implements ZaimAccount {
	readonly id: string;
	readonly lineUserId: string;
	readonly accessToken: string;
	readonly accessTokenSecret: string;
	readonly createdAt: Date;

	constructor(params: ZaimAccount) {
		this.id = params.id;
		this.lineUserId = params.lineUserId;
		this.accessToken = params.accessToken;
		this.accessTokenSecret = params.accessTokenSecret;
		this.createdAt = params.createdAt;
	}
}

export type ZaimAccountCreateParams = Omit<ZaimAccount, 'id' | 'createdAt'>;
