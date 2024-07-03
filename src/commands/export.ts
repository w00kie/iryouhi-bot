import { InputFile } from "grammy";

import { generateExcelFile } from "@/lib/excel";
import type { MyContext } from "@/types";

export async function exportReceipts(ctx: MyContext): Promise<void> {
  const user_id = ctx.session.dbuser_id;
  if (!user_id) {
    await ctx.reply("You are not registered.");
    return;
  }

  let year = new Date().getFullYear();

  const input = ctx.match;
  if (input) {
    const input_year = parseInt(input as string);
    if (isNaN(input_year)) {
      await ctx.reply(`Invalid input. Defaulting to ${year}.`);
    } else {
      year = input_year;
    }
  }

  await ctx.reply(`Exporting receipts for year ${year}...`);

  const reportBuffer = await generateExcelFile(user_id, year);

  await ctx.replyWithDocument(new InputFile(reportBuffer, `receipts_${year}.xlsx`));
}
