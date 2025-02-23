import { ReceiptValidationKeyboard } from "@/keyboards";
import { scanReceipt } from "@/lib/openai";
import { storeReceiptImage } from "@/lib/r2storage";
import { generateReceiptsHistory, receiptDataToMarkdown } from "@/lib/utils";
import prisma from "@/prismadb";
import type { MyContext } from "@/types";

interface scanReceiptJobPayload {
  ctx: MyContext;
}

export default async function scanReceiptJob(payload: scanReceiptJobPayload): Promise<void> {
  const { ctx } = payload;

  if (!ctx.session.dbuser_id) {
    throw new Error("User not registered");
  }
  const user_id = ctx.session.dbuser_id;

  // Get the file from the message
  const file = await ctx.getFile();
  if (!file) throw new Error("No file found in the message");
  const filepath = await file.download();
  // Query the database for the user's receipts history
  const history = await generateReceiptsHistory(user_id);

  // Run the long tasks concurrently
  const [json_receipt, storage_key] = await Promise.all([
    scanReceipt(filepath, history, user_id),
    storeReceiptImage(filepath, user_id),
  ]);

  // Create the receipt record in the database.
  const receipt = await prisma.receipt.create({
    data: {
      user_id: user_id,
      storage_url: storage_key,
      patient_name: json_receipt.patient_name,
      vendor_name: json_receipt.vendor_name,
      issue_date: json_receipt.issue_date,
      total_amount: json_receipt.total_amount,
      bill_type: json_receipt.bill_type,
    },
  });

  await payload.ctx.reply(receiptDataToMarkdown(json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: ReceiptValidationKeyboard,
  });
  await payload.ctx.reply("Use the buttons above or tell me what to edit.");
  payload.ctx.session.current_receipt = receipt;
}
