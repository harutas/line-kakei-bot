import crypto from 'node:crypto';
import OAuth from 'oauth-1.0a';
import oAuthTempTokenRepository from '../databases/repositories/OAuthTempTokenRepository';
import zaimService from '../services/zaimService';
import { dayjs } from '../utils/datetime';

const BASE_URL = process.env.BASE_URL || 'http://localhost';
const REQUEST_TOKEN_URL = 'https://api.zaim.net/v2/auth/request';
const ACCESS_TOKEN_URL = 'https://api.zaim.net/v2/auth/access';

export const oauth = new OAuth({
	consumer: {
		key: process.env.ZAIM_CONSUMER_KEY || '',
		secret: process.env.ZAIM_CONSUMER_SECRET || '',
	},
	signature_method: 'HMAC-SHA1',
	hash_function(baseString, key) {
		return crypto.createHmac('sha1', key).update(baseString).digest('base64');
	},
});

export const createAuthorizeUrl = async (lineUserId: string) => {
	const requestData = {
		url: REQUEST_TOKEN_URL,
		method: 'POST',
		data: {
			oauth_callback: `${BASE_URL}/zaim/callback`,
		},
	};

	const headers = oauth.toHeader(oauth.authorize(requestData));

	const res = await fetch(REQUEST_TOKEN_URL, {
		method: 'POST',
		headers: { ...headers },
	});

	const text = await res.text();
	const params = new URLSearchParams(text);

	const oauthToken = params.get('oauth_token');
	const oauthTokenSecret = params.get('oauth_token_secret');

	if (!oauthToken || !oauthTokenSecret) {
		throw new Error('Failed to get request token');
	}

	// リクエストトークンとリクエストトークンシークレット
	await zaimService.saveRequestToken({ oauthToken, oauthTokenSecret, lineUserId });

	return `https://auth.zaim.net/users/auth?oauth_token=${oauthToken}`;
};

export const exchangeAccessToken = async (oauthToken: string, oauthVerifier: string) => {
	const requestToken = await oAuthTempTokenRepository.findById(oauthToken);

	if (!requestToken) {
		throw new Error('token not foun.');
	}

	if (dayjs().isAfter(requestToken.expiresAt)) {
		throw new Error('token expired.');
	}

	const requestData = {
		url: ACCESS_TOKEN_URL,
		method: 'POST',
		data: {
			oauth_verifier: oauthVerifier,
		},
	};

	const headers = oauth.toHeader(
		oauth.authorize(requestData, {
			key: requestToken.oauthToken,
			secret: requestToken.oauthTokenSecret,
		}),
	);

	const res = await fetch(ACCESS_TOKEN_URL, {
		method: 'POST',
		headers: { ...headers },
	});

	const text = await res.text();
	const params = new URLSearchParams(text);

	return {
		lineUserId: requestToken.lineUserId,
		accessToken: params.get('oauth_token') || '',
		accessTokenSecret: params.get('oauth_token_secret') || '',
	};
};
