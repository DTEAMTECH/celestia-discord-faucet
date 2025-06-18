require("dotenv").config();
const express = require("express");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient } = require("@cosmjs/stargate");

const app = express();
app.use(express.json());

async function createClient() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    process.env.FAUCET_MNEMONIC,
    { prefix: process.env.PREFIX }
  );
  const [firstAccount] = await wallet.getAccounts();
  const client = await SigningStargateClient.connectWithSigner(
    process.env.RPC_ENDPOINT,
    wallet
  );
  return { client, firstAccount };
}

app.post("/credit", async (req, res) => {
  const { denom, address } = req.body;
  const amount = {
    denom,
    amount: `${
      Number(process.env.NUMBER_OF_TOKENS) *
      10 ** Number(process.env.DENOM_EXPONENT)
    }`,
  };

  try {
    const { client, firstAccount } = await createClient();
    const fee = {
      amount: [{ denom: process.env.DENOM, amount: "5000" }],
      gas: "200000",
    };
    const result = await client.sendTokens(
      firstAccount.address,
      address,
      [amount],
      fee,
      "Credited by faucet service"
    );
    res.json({ txHash: result.transactionHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send tokens" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Faucet server running on port ${PORT}`);
});
