import { conversations } from "@grammyjs/conversations";
import { hydrateFiles } from "@grammyjs/files";
import { freeStorage } from "@grammyjs/storage-free";
import * as Sentry from "@sentry/bun";
import { Bot, GrammyError, HttpError, session, webhookCallback } from "grammy";
import { Hono } from "hono";
import { exit } from "process";

import { myCommands } from "@/commands";
import ReceiptScanConvo from "@/conversations/receipt";
import { registerUser } from "@/middleware/user";
import type { MyContext, SessionData } from "@/types";

import prisma from "./prismadb";

// Setup Sentry error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

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
bot.use(session({ initial: () => ({}), storage: freeStorage<SessionData>(bot.token) }));
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

// Register list of commands
bot.api.setMyCommands([
  { command: "start", description: "Review the welcome message" },
  { command: "help", description: "Show this help message" },
  { command: "stats", description: "Show the number of receipts saved and total amount for current year" },
  {
    command: "export",
    description: "Export all receipts for a given year as an Excel file (defaults to current year)",
  },
]);

// Setup webhook mode
if (!process.env.WEBHOOK_URL) {
  console.error("WEBHOOK_URL environment variable must be provided!");
  process.exit(1);
}
const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
await bot.api.setWebhook(webhookUrl);
console.log(`Webhook registered at ${webhookUrl}`);

// Serve the webhook with Hono
const app = new Hono();

app.use("/webhook", webhookCallback(bot, "hono"));

app.get("/", async (c) => {
  const userCount = await prisma.user.count();
  return c.text(`ALIVE!\nUser count: ${userCount}`);
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
  Sentry.captureException(err);
  ctx.reply("An error occurred while processing your request.");
});

// Stop the bot gracefully
process.once("SIGINT", () => {
  bot.stop();
  exit();
});
process.once("SIGTERM", () => {
  bot.stop();
  exit();
});

// Export the Hono webserver for Cloudflare Workers
export default app;
