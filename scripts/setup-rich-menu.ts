import * as fs from 'node:fs';
import * as path from 'node:path';
import { messagingApi } from '@line/bot-sdk';
import {
	ACTION_CURRENT_MONTH_SUMMARY,
	ACTION_HOW_TO_USE,
	ACTION_VIEW_WEEK_PAYMENTS,
} from '../src/types/postback';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

if (!channelAccessToken) {
	console.error('❌ Error: LINE_CHANNEL_ACCESS_TOKEN is not set');
	process.exit(1);
}

const client = new messagingApi.MessagingApiClient({
	channelAccessToken,
});

const blobClient = new messagingApi.MessagingApiBlobClient({
	channelAccessToken,
});

async function setupRichMenu() {
	// 既存のデフォルトリッチメニューがあれば削除
	try {
		const defaultMenu = await client.getDefaultRichMenuId();
		if (defaultMenu.richMenuId) {
			console.log(`Deleting existing rich menu: ${defaultMenu.richMenuId}`);
			await client.cancelDefaultRichMenu();
			await client.deleteRichMenu(defaultMenu.richMenuId);
		}
	} catch (_error) {
		console.log('No existing default rich menu found');
	}

	// リッチメニュー定義（3つのボタンを横並び）
	const richMenuRequest = {
		size: {
			width: 2500,
			height: 843,
		},
		selected: false,
		name: 'Kakei Bot Menu',
		chatBarText: 'メニュー',
		areas: [
			{
				bounds: { x: 0, y: 0, width: 833, height: 843 },
				action: {
					type: 'postback' as const,
					data: JSON.stringify({ action: ACTION_VIEW_WEEK_PAYMENTS }),
					displayText: '今週の支払い',
				},
			},
			{
				bounds: { x: 833, y: 0, width: 834, height: 843 },
				action: {
					type: 'postback' as const,
					data: JSON.stringify({ action: ACTION_CURRENT_MONTH_SUMMARY }),
					displayText: '今月の支払い',
				},
			},
			{
				bounds: { x: 1667, y: 0, width: 833, height: 843 },
				action: {
					type: 'postback' as const,
					data: JSON.stringify({ action: ACTION_HOW_TO_USE }),
					displayText: '使い方',
				},
			},
		],
	};

	// バリデーション
	console.log('Validating rich menu...');
	try {
		await client.validateRichMenuObject(richMenuRequest);
		console.log('✓ Rich menu validation passed');
	} catch (error) {
		console.error('❌ Rich menu validation failed:', error);
		throw error;
	}

	// リッチメニュー作成
	console.log('Creating rich menu...');
	const response = await client.createRichMenu(richMenuRequest);
	const richMenuId = response.richMenuId;
	console.log(`✓ Rich menu created: ${richMenuId}`);

	// 画像アップロード
	console.log('Uploading rich menu image...');
	const imagePath = path.join(__dirname, 'assets', 'rich-menu.png');

	if (!fs.existsSync(imagePath)) {
		throw new Error(
			`Image not found: ${imagePath}\nPlease prepare a 2500x1686px PNG/JPEG image at scripts/assets/rich-menu.png`,
		);
	}

	const imageBuffer = fs.readFileSync(imagePath);
	const image = new Blob([imageBuffer], { type: 'image/png' });
	await blobClient.setRichMenuImage(richMenuId, image);
	console.log('✓ Image uploaded successfully');

	// デフォルトリッチメニューとして設定
	console.log('Setting as default rich menu...');
	await client.setDefaultRichMenu(richMenuId);
	console.log('✓ Rich menu setup completed!');
	console.log(`\nRich Menu ID: ${richMenuId}`);
}

setupRichMenu()
	.then(() => {
		console.log('\n✅ All done!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Error:', error);
		process.exit(1);
	});
