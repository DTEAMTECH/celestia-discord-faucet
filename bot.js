const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const requestCache = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 60 });
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID
const PORT = process.env.PORT

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function isValidAddress(address) {
    const regex = /^celestia1[0-9a-z]{38}$/;
    return regex.test(address);
}

function getRemainingTime(lastRequestTime) {
    const now = Date.now();
    const msIn24Hours = 24 * 60 * 60 * 1000;
    const remainingTime = msIn24Hours - (now - lastRequestTime);

    const hours = Math.floor((remainingTime % msIn24Hours) / (60 * 60 * 1000));
    const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

    return { hours, minutes, seconds };
}

client.on('messageCreate', async (message) => {
    if (message.channel.id !== CHANNEL_ID) return;

    if (message.content.startsWith('!faucet')) {
        const args = message.content.split(' ');
        if (args.length !== 2) {
            message.reply('Usage: !faucet <address>');
            return;
        }

        const address = args[1];
        const userId = message.author.id;

        if (!isValidAddress(address)) {
            const embed = new EmbedBuilder()
                .setTitle('Tokens have not been sent')
                .setDescription(`🔴 **An error has occurred:**\nInvalid address format. Please provide a valid ${process.env.PROJECT_NAME.charAt(0).toUpperCase() + process.env.PROJECT_NAME.slice(1)} address.`)
                .setThumbnail(`https://raw.githubusercontent.com/DTEAMTECH/contributions/main/${process.env.PROJECT_NAME}/utils/faucet.png`)
                .setColor('Red')
                .setTimestamp();

            message.reply({ embeds: [embed] });
            return;
        }

        const lastAddressRequestTime = requestCache.get(address);
        const lastUserRequestTime = requestCache.get(userId);

        if (lastUserRequestTime) {
            const remainingTime = getRemainingTime(lastUserRequestTime);

            const embed = new EmbedBuilder()
                .setTitle('Tokens have not been sent')
                .setDescription(`🔴 **An error has occurred:**\nYou have already requested tokens in the last 24 hours.\n\nPlease try again in ${remainingTime.hours} hours, ${remainingTime.minutes} minutes, and ${remainingTime.seconds} seconds.`)
                .setThumbnail(`https://raw.githubusercontent.com/DTEAMTECH/contributions/main/${process.env.PROJECT_NAME}/utils/faucet.png`)
                .setColor('Red')
                .setTimestamp();

            message.reply({ embeds: [embed] });
            return;
        }

        if (lastAddressRequestTime) {
            const remainingTime = getRemainingTime(lastAddressRequestTime);

            const embed = new EmbedBuilder()
                .setTitle('Tokens have not been sent')
                .setDescription(`🔴 **An error has occurred:**\nThis address has already requested tokens in the last 24 hours.\n\nPlease try again in ${remainingTime.hours} hours, ${remainingTime.minutes} minutes, and ${remainingTime.seconds} seconds.`)
                .setThumbnail(`https://raw.githubusercontent.com/DTEAMTECH/contributions/main/${process.env.PROJECT_NAME}/utils/faucet.png`)
                .setColor('Red')
                .setTimestamp();

            message.reply({ embeds: [embed] });
            return;
        }

        const loadingMessage = await message.reply('Creating transaction...');

        try {
            const response = await axios.post(`http://localhost:${PORT}/credit`, {
                denom: process.env.DENOM,
                address,
            });

            const txHash = response.data.txHash;
            const explorerLink = `https://explorer.testnet.dteam.tech/${process.env.PROJECT_NAME}/tx/${txHash}`;

            const embed = new EmbedBuilder()
                .setTitle('Tokens successfully sent')
                .setDescription(`🟢 **Explorer link:** ${explorerLink}`)
                .setThumbnail(`https://raw.githubusercontent.com/DTEAMTECH/contributions/main/${process.env.PROJECT_NAME}/utils/faucet.png`)
                .setColor('Green')
                .setTimestamp();

            await loadingMessage.edit({ content: null, embeds: [embed] });

            requestCache.set(address, Date.now());
            requestCache.set(userId, Date.now());
        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('Tokens have not been sent')
                .setDescription(`🔴 **An error has occurred.** Please, try again later.`)
                .setThumbnail(`https://raw.githubusercontent.com/DTEAMTECH/contributions/main/${process.env.PROJECT_NAME}/utils/faucet.png`)
                .setColor('Red')
                .setTimestamp();

            await loadingMessage.edit({ content: null, embeds: [embed] });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);