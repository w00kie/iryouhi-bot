import { conversations } from "@grammyjs/conversations";
import { hydrateFiles } from "@grammyjs/files";
import { PrismaAdapter } from "@grammyjs/storage-prisma";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { exit } from "process";

import { myCommands } from "@/commands";
import ReceiptScanConvo from "@/conversations/receipt";
import { registerUser } from "@/middleware/user";
import type { MyContext } from "@/types";

import prisma from "./prismadb";

// Load environment variables from .env file
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// Ensure the bot token is provided
if (!TELEGRAM_TOKEN) {
  console.error("Bot token must be provided!");
  process.exit(1);
}

// Create a new bot instance
const bot = new Bot<MyContext>(TELEGRAM_TOKEN);

// Use the session and conversations middleware
bot.use(session({ initial: () => ({}), storage: new PrismaAdapter(prisma.session) }));
bot.use(conversations());
bot.api.config.use(hydrateFiles(bot.token));

// Custom middleware to register users
bot.use(registerUser);

// Register the commands
bot.use(myCommands);
bot.command("whoami", (ctx) =>
  ctx.reply(`You are ${ctx.from?.username} - ${ctx.from?.id} - DB: ${ctx.session.dbuser_id}`),
);

// Register the receiptScan conversation to start when a photo is received
bot.use(ReceiptScanConvo);
bot.on("message:photo", async (ctx) => await ctx.conversation.enter("receiptScan"));

// Start the bot
bot.start();

const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("ALIVE!");
  },
});

// Catchall for unknown button clicks
bot.on("callback_query:data", async (ctx) => {
  console.log("Unknown button event with payload", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery(); // remove loading animation
});

// Log errors
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
  ctx.reply("An error occurred while processing your request.");
});

// Stop the bot gracefully
process.once("SIGINT", () => {
  bot.stop();
  server.stop();
  exit();
});
process.once("SIGTERM", () => {
  bot.stop();
  server.stop();
  exit();
});
