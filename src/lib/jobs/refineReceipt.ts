import { ReceiptValidationKeyboard } from "@/keyboards";
import { editReceiptData } from "@/lib/openai";
import { receiptDataToMarkdown } from "@/lib/utils";
import prisma from "@/prismadb";
import { type MyContext, type ReceiptData, ReceiptDataSchema } from "@/types";

interface refineReceiptJobPayload {
  ctx: MyContext;
}

export default async function refineReceiptJob(payload: refineReceiptJobPayload): Promise<void> {
  const { ctx } = payload;

  if (!ctx.session.dbuser_id) {
    throw new Error("User not registered");
  }
  if (!ctx.session.current_receipt) {
    throw new Error("No receipt found in session");
  }

  const receipt_id = ctx.session.current_receipt.id;
  const json_receipt = ReceiptDataSchema.parse(ctx.session.current_receipt);
  const edited_json_receipt = await editReceiptData(json_receipt, ctx.message?.text, ctx.session.dbuser_id);

  // Update the receipt in the database
  const new_receipt = await prisma.receipt.update({
    where: { id: receipt_id },
    data: {
      patient_name: edited_json_receipt.patient_name,
      vendor_name: edited_json_receipt.vendor_name,
      issue_date: edited_json_receipt.issue_date,
      total_amount: edited_json_receipt.total_amount,
      bill_type: edited_json_receipt.bill_type,
    },
  });

  await ctx.reply(receiptDataToMarkdown(edited_json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: ReceiptValidationKeyboard,
  });

  ctx.session.current_receipt = new_receipt;
}
