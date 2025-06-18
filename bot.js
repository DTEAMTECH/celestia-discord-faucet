require("dotenv").config();
const { REST, Routes } = require("discord.js");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Colors,
} = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const axios = require("axios");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const FAUCET_PORT = process.env.PORT;
const PROJECT = process.env.PROJECT_NAME;

const commands = [
  new SlashCommandBuilder()
    .setName("faucet")
    .setDescription("Request testnet tokens from the faucet")
    .addStringOption((opt) =>
      opt
        .setName("address")
        .setDescription(`${PROJECT} address to credit`)
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log("Slash command registered.");
  } catch (err) {
    console.error("Command registration failed:", err);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.channelId !== CHANNEL_ID) {
    return interaction.reply({
      content: "❌ This command can only be used in the designated channel.",
      ephemeral: true,
    });
  }
  if (interaction.commandName === "faucet") {
    const address = interaction.options.getString("address", true);
    await interaction.deferReply({ ephemeral: true });
    if (!/^celestia1[0-9a-z]{38}$/.test(address)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Faucet Error")
            .setDescription("🔴 Invalid address format.")
            .setColor(Colors.Red)
            .setTimestamp(),
        ],
      });
    }
    try {
      const resp = await axios.post(`http://localhost:${FAUCET_PORT}/credit`, {
        denom: process.env.DENOM,
        address,
      });
      const txHash = resp.data.txHash;
      const explorer = `https://explorer.testnet.dteam.tech/${PROJECT}/tx/${txHash}`;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Faucet Success")
            .setDescription(`🟢 [View on Explorer](${explorer})`)
            .setColor(Colors.Green)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Faucet Error")
            .setDescription("🔴 Failed to credit tokens. Try again later.")
            .setColor(Colors.Red)
            .setTimestamp(),
        ],
      });
    }
  }
});

client.login(TOKEN);
