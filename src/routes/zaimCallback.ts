import express from 'express';
import { exchangeAccessToken } from '../auth/zaim';
import zaimService from '../services/zaimService';

const router = express.Router();

router.get('/', async (req, res) => {
	const { oauth_token = '', oauth_verifier = '' } = req.query;

	if (!oauth_token || !oauth_verifier) {
		return res.status(400).send('Invalid request');
	}

	const result = await exchangeAccessToken(oauth_token as string, oauth_verifier as string);

	await zaimService.saveZaimAccount({
		accessToken: result.accessToken,
		accessTokenSecret: result.accessTokenSecret,
		lineUserId: result.lineUserId,
	});

	await zaimService.deleteRequestToken(oauth_token as string);

	res.send('Zaim連携が完了しました。LINEに戻ってください。');
});

export default router;
