import { Composer } from "grammy";

import type { MyContext } from "@/types";

import { exportReceipts } from "./export";
import { stats } from "./stats";

export const myCommands = new Composer<MyContext>();

myCommands.command("start", async (ctx) => {
  await ctx.reply("Hello and welcome to the Medical Expense Accountant bot!");
  await ctx.reply(
    "This bot helps you keep track of your medical expenses. You can scan a receipt to extract its metadata and compile an list of all expenses in an excel file that can easily be imported in the online tax return app.",
  );
  await ctx.reply("You can use the /help command to get a list of available actions.");
  await ctx.reply("To get started, simply send a photo of your receipt.");
});

myCommands.command("help", (ctx) =>
  ctx.reply(
    "*Available commands:*\n\n" +
      "/start \\- Review the welcome message\n" +
      "/help \\- Show this help message\n" +
      "/stats \\- Show the number of receipts saved and total amount for current year\n" +
      "/export \\[YYYY\\] \\- Export all receipts for the given year as an Excel file \\(defaults to current year\\)",
    { parse_mode: "MarkdownV2" },
  ),
);

myCommands.command("stats", stats);
myCommands.command("export", exportReceipts);
