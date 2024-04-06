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
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html`,
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

    async function detailYouTube(url) {
        client.sendMessage(message.from, '[⏳] Loading..');
        try {
            ytdl.getInfo(url).then((info) => {
                let data = {
                    "channel": {
                        "name": info.videoDetails.author.name,
                        "user": info.videoDetails.author.user,
                        "channelUrl": info.videoDetails.author.channel_url,
                        "userUrl": info.videoDetails.author.user_url,
                        "verified": info.videoDetails.author.verified,
                        "subscriber": info.videoDetails.author.subscriber_count
                    },
                    "video": {
                        "title": info.videoDetails.title,
                        "description": info.videoDetails.description,
                        "lengthSeconds": info.videoDetails.lengthSeconds,
                        "videoUrl": info.videoDetails.video_url,
                        "publishDate": info.videoDetails.publishDate,
                        "viewCount": info.videoDetails.viewCount
                    }
                }
                client.sendMessage(message.from, `*CHANNEL DETAILS*\n• Name : *${data.channel.name}*\n• User : *${data.channel.user}*\n• Verified : *${data.channel.verified}*\n• Channel : *${data.channel.channelUrl}*\n• Subscriber : *${data.channel.subscriber}*`);
                client.sendMessage(message.from, `*VIDEO DETAILS*\n• Title : *${data.video.title}*\n• Seconds : *${data.video.lengthSeconds}*\n• VideoURL : *${data.video.videoUrl}*\n• Publish : *${data.video.publishDate}*\n• Viewers : *${data.video.viewCount}*`)
                client.sendMessage(message.from, '*[✅]* Successfully!');
            });
        } catch (err) {
            console.log(err);
            client.sendMessage(message.from, '*[❎]* Failed!');
        }
    }

    async function downloadYouTube(url, format, filter) {
        client.sendMessage(message.from, '[⏳] Loading..');
        let timeStart = Date.now();
        try {
            let info = await ytdl.getInfo(url);
            let data = {
                "channel": {
                    "name": info.videoDetails.author.name,
                    "user": info.videoDetails.author.user,
                    "channelUrl": info.videoDetails.author.channel_url,
                    "userUrl": info.videoDetails.author.user_url,
                    "verified": info.videoDetails.author.verified,
                    "subscriber": info.videoDetails.author.subscriber_count
                },
                "video": {
                    "title": info.videoDetails.title,
                    "description": info.videoDetails.description,
                    "lengthSeconds": info.videoDetails.lengthSeconds,
                    "videoUrl": info.videoDetails.video_url,
                    "publishDate": info.videoDetails.publishDate,
                    "viewCount": info.videoDetails.viewCount
                }
            }
            ytdl(url, { filter: filter, format: format, quality: 'highest' }).pipe(fs.createWriteStream(`./src/database/download.${format}`)).on('finish', async () => {
                const media = await MessageMedia.fromFilePath(`./src/database/download.${format}`);
                let timestamp = Date.now() - timeStart;
                media.filename = `${config.filename.mp3}.${format}`;
                await client.sendMessage(message.from, media, { sendMediaAsDocument: true });
                client.sendMessage(message.from, `• Title : *${data.video.title}*\n• Channel : *${data.channel.user}*\n• View Count : *${data.video.viewCount}*\n• TimeStamp : *${timestamp / 1000} seconds*`);
                client.sendMessage(message.from, '*[✅]* Successfully!');
            });
        } catch (err) {
            console.log(err);
            client.sendMessage(message.from, '*[❎]* Failed!');
        }
    }

    if ((isGroups && config.groups) || isGroups) return;
    if (message.body == `${config.prefix}help`) return client.sendMessage(message.from, `*${config.name}*\n\n[🎥] : *${config.prefix}video <youtube-url>*\n[🎧] : *${config.prefix}audio <youtube-url>*\n\n*Example :*\n${config.prefix}audio https://youtu.be/abcdefghij`);
    if (url == undefined) return;
    if ((message.body.startsWith(`${config.prefix}audio`) || message.body.startsWith(`${config.prefix}video`) || message.body.startsWith(`${config.prefix}detail`)) && !ytdl.validateURL(url)) return client.sendMessage(message.from, '*[❎]* Failed!, Invalid YouTube URL');
    if (message.body.startsWith(`${config.prefix}audio`)) {
        downloadYouTube(url, 'mp3', 'audioonly');
    } else if (message.body.startsWith(`${config.prefix}video`)) {
        downloadYouTube(url, 'mp4', 'audioandvideo');
    } else if (message.body.startsWith(`${config.prefix}detail`)) {
        detailYouTube(url);
    }
});

client.initialize();
