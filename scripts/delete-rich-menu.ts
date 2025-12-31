import { messagingApi } from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

if (!channelAccessToken) {
	console.error('❌ Error: LINE_CHANNEL_ACCESS_TOKEN is not set');
	process.exit(1);
}

const client = new messagingApi.MessagingApiClient({
	channelAccessToken,
});

async function deleteRichMenu() {
	try {
		const defaultMenu = await client.getDefaultRichMenuId();

		if (!defaultMenu.richMenuId) {
			console.log('No default rich menu found.');
			return;
		}

		console.log(`Deleting rich menu: ${defaultMenu.richMenuId}`);
		await client.cancelDefaultRichMenu();
		await client.deleteRichMenu(defaultMenu.richMenuId);
		console.log('✓ Rich menu deleted successfully');
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

deleteRichMenu()
	.then(() => {
		console.log('\n✅ Done!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Error:', error);
		process.exit(1);
	});
