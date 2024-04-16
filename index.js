const { Client, LocalAuth, Buttons, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const ytdl = require('ytdl-core');
const config = require('./src/config/config.json');

const client = new Client({
	restartOnAuthFail: true,
	puppeteer: {
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		executablePath: `${config.executablePath}`,
	},
	webVersionCache: {
		type: 'remote',
		remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html`,
	},
	authStrategy: new LocalAuth({ clientId: "client" })
});

client.on('qr', (qr) => {
	console.log(`[🤳] Scan the QR below : `);
	qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
	console.log('[✅] Client is ready!');
});

client.on('message', async (message) => {
	let url = message.body.split(' ')[1];


	async function downloadYouTube(url, format, filter) {
		client.sendMessage(message.from, '[⏳] Loading..');
		try {
			let info = await ytdl.getInfo(url);
			let title = info.videoDetails.title
			ytdl(url, { filter: filter, format: format, quality: 'highest' }).pipe(fs.createWriteStream(`./src/database/${title}.${format}`)).on('finish', async () => {
				let media = await MessageMedia.fromFilePath(`./src/database/${title}.${format}`);
				media.filename = `${title}.${format}`;
				await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
				client.searchMessages(message.from, info.videoDetails.title)
			});
		} catch (err) {
			console.log(err);
			client.sendMessage(message.from, '*[❎]* Failed!');
		}
	}

	if (message.body == `${config.prefix}help`) return client.sendMessage(message.from, `*${config.name}*\n\n[🎥] : *${config.prefix}video <youtube-url>*\n[🎧] : *${config.prefix}audio <youtube-url>*\n\n*Example :*\n${config.prefix}audio https://youtu.be/abcdefghij`);
	if (url == undefined) return;
	if ((message.body.startsWith(`${config.prefix}audio`) || message.body.startsWith(`${config.prefix}video`)) && !ytdl.validateURL(url)) return client.sendMessage(message.from, '*[❎]* Failed!, Invalid YouTube URL');
	if (message.body.startsWith(`${config.prefix}audio`)) {
		downloadYouTube(url, 'mp3', 'audioonly');
	} else if (message.body.startsWith(`${config.prefix}video`)) {
		downloadYouTube(url, 'mp4', 'audioandvideo');
	}
});

client.initialize();
