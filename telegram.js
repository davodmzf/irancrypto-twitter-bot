import { abbreviateNumber, numFormat } from "./src/number.js";
import { getRecap } from "./src/api.js";
import { updateLastRunTime } from "./src/dynamodb.js";
import { createImageFromTemplate, getRandomTheme } from "./src/html.js";
import { getENV } from "./src/env.js";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(getENV("TELEGRAM_BOT_TOKEN"));

/**
 * Daily recap of the most traded tokens on the Iran's cryptocurrency market to publish on Telegram
 * @param {*} event
 * @param {*} context
 */
export const coinrecap = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run daily recap
    await dailyCoinsRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("telegram", { type: "daily-recap" });
    // Log
    console.log("Daily recap published successfully on telegram!");
  } catch (err) {
    console.error(err);
  }
};

/**
 * Generate a tokens weekly recap image and publish it on Instagram
 */
async function dailyCoinsRecap() {
  try {
    // Get Data from API
    const data = await getRecap("coin", "daily");
    // USDT Token
    // const usd= data.find((item) => item.has_iran && item.symbol === 'USDT');
    // Total Trade Volume
    const totalVol = data
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + item.irr.volume, 0);
    // Filter Data
    const tokens = data
      .filter((item) => item.has_iran)
      .map((item) => {
        return {
          name: item.name_en,
          price: "$" + numFormat(item.usd.price_avg),
          volume:
            abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
          icon: item.icon,
        };
      })
      .slice(0, 10);

    // Create Image
    const image = await createImageFromTemplate(
      "table-coin-" + getRandomTheme(),
      {
        tokens,
        headers: ["Token", "Average Price", "Traded Volume"],
        title: "Daily Recap",
        subtitle: `Total traded volume today: ${abbreviateNumber(
          Math.round(totalVol),
          0,
          true
        )} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "daily-coins.jpg"
    );

    if (!image) {
      throw new Error("Image is not generated!");
    }
    // Get Caption from AI
    const caption = `
📈 Today's Crypto Market Recap | ${new Date().toISOString().slice(0, 10)}

📊 Total Traded Volume Today: ${numFormat(Math.round(totalVol))} IRR

🖥 Check the website for more details: <a href="https://irancrypto.market/popular/">irancrypto.market</a>

🛎 Follow us on <a href="https://instagram.com/irancryptomarket">Instagram @irancryptomarket</a> | <a href="https://twitter.com/ircryptomarket">Twitter @ircryptomarket</a> | <a href="https://t.me/irancrypto_market">Telegram @irancrypto_market</a>
`;

    // Publish the image on Telegram channel
    await bot.sendPhoto(getENV("TELEGRAM_CHANNEL_ID"), image, {
      caption: caption,
      parse_mode: "html",
      disable_web_page_preview: true,
    });
  } catch (err) {
    throw err;
  }
}
