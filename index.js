const { Client, LocalAuth, Buttons, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const colors = require('colors');
const fs = require('fs');
const ytdl = require('ytdl-core');

const client = new Client({ 
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
    },
    authStrategy: new LocalAuth({ clientId: "client" })
});
const config = require('./src/config/config.json');

client.on('qr', (qr) => {
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Scan the QR below : `);
    qrcode.generate(qr, { small: true });
});
 
client.on('ready', () => {
    console.clear();
    const consoleText = './src/config/console.txt';
    fs.readFile(consoleText, 'utf-8', (err, data) => {
        if (err) {
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Console Text not found!`.yellow);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        } else {
            console.log(data.green);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        }
    })
});

client.on('message', async (message) => {
    let url = message.body.split(' ')[1];
    let isGroups = message.from.endsWith('@g.us') ? true : false;

    async function downloadYouTube(url, format, filter) {
        client.sendMessage(message.from, '[⏳] Loading..');
        try {
            ytdl(url, { filter: filter, format: format, quality: 'highest' }).pipe(fs.createWriteStream(`./src/database/download.${format}`)).on('finish', async () => {
                const media = await MessageMedia.fromFilePath(`./src/database/download.${format}`);
                media.filename = `${config.filename.mp3}.${format}`;
                await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
                client.sendMessage(message.from, '*[✅]* Successfully!');
            });
        } catch {
            client.sendMessage(message.from, '*[❎]* Failed!')
        }
    }

    if ((isGroups && config.groups) || isGroups) return;
    if (message.body == `${config.prefix}help`) return client.sendMessage(message.from, `*${config.name}*\n\n[🎥] : *${config.prefix}video <youtube-url>*\n[🎧] : *${config.prefix}audio <youtube-url>*\n\n*Example :*\n${config.prefix}audio https://youtu.be/abcdefghij`);
    if (url == undefined) return client.sendMessage(message.from, '*[❎]* Failed!, Please insert YouTube URL');
    if (!ytdl.validateURL(url)) return client.sendMessage(message.from, '*[❎]* Failed!, Invalid YouTube URL');
    if (message.body.startsWith(`${config.prefix}audio`)) {
        downloadYouTube(url, 'mp3', 'audioonly');
    } else if (message.body.startsWith(`${config.prefix}video`)) {
        downloadYouTube(url, 'mp4', 'audioandvideo');
    }
});

client.initialize();
