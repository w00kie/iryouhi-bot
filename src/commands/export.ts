import { InputFile } from "grammy";

import { generateExcelFile } from "@/lib/excel";
import type { MyContext } from "@/types";

export async function exportReceipts(ctx: MyContext): Promise<void> {
  const user_id = ctx.session.dbuser_id;
  if (!user_id) {
    await ctx.reply("You are not registered.");
    return;
  }

  const year = new Date().getFullYear();

  await ctx.reply(`Exporting receipts for year ${year}...`);

  const reportUrl = await generateExcelFile(user_id, year);

  console.log("Report URL:", reportUrl);
  // await ctx.replyWithDocument(reportUrl);
  await ctx.replyWithDocument(new InputFile(reportUrl, `receipts_${year}.xlsx`));
}
