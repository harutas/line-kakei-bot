export interface OAuthTempToken {
	id: string;
	oauthToken: string;
	oauthTokenSecret: string;
	lineUserId: string;
	expiresAt: Date;
}

export class OAuthTempTokenEntity implements OAuthTempToken {
	readonly id: string;
	readonly oauthToken: string;
	readonly oauthTokenSecret: string;
	readonly lineUserId: string;
	readonly expiresAt: Date;

	constructor(params: OAuthTempToken) {
		this.id = params.id;
		this.oauthToken = params.oauthToken;
		this.oauthTokenSecret = params.oauthTokenSecret;
		this.lineUserId = params.lineUserId;
		this.expiresAt = params.expiresAt;
	}
}

export type OAuthTempTokenCreateParams = Omit<OAuthTempToken, 'id' | 'expiresAt'>;
