import { InlineKeyboard } from "grammy";
import { createConversation } from "@grammyjs/conversations";
import type { MyContext, MyConversation } from "@/types";
import { editReceiptData, scanReceipt, type ReceiptData } from "@/lib/gemini";
import prisma from "@/prismadb";
import type { Receipt } from "@prisma/client";
import {
  dateStringToISO,
  generateReceiptsHistory,
  receiptDataToMarkdown,
} from "@/lib/utils";

// Define an inline keyboard with two buttons
const inlineKeyboard = new InlineKeyboard()
  .text("Save", "/save")
  .text("Cancel", "/cancel");

// Function to process the receipt scan
async function processScan(conversation: MyConversation, ctx: MyContext) {
  if (!conversation.session.dbuser) {
    throw new Error("User not registered");
  }
  const user_id = conversation.session.dbuser.id;

  await ctx.reply("Processing receipt...");

  const file = await ctx.getFile();
  if (!file) throw new Error("No file found in the message");
  const path = await conversation.external(() => file.download());
  console.log("Receipt file path:", path);

  const history = await generateReceiptsHistory(conversation.session.dbuser.id);

  const json_receipt = await conversation.external(() =>
    scanReceipt(path, history)
  );

  const receipt = await conversation.external(() =>
    prisma.receipt.create({
      data: {
        user_id: user_id,
        patient_name: json_receipt.patient_name,
        vendor_name: json_receipt.vendor_name,
        issue_date: json_receipt.issue_date
          ? dateStringToISO(json_receipt.issue_date)
          : null,
        total_amount: json_receipt.total_amount,
        bill_type: json_receipt.bill_type,
      },
    })
  );

  await ctx.reply(receiptDataToMarkdown(json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: inlineKeyboard,
  });

  conversation.session.current_receipt = receipt;
}

// Function to process any text edits
async function processEdit(conversation: MyConversation, ctx: MyContext) {
  if (!conversation.session.current_receipt) {
    throw new Error("No receipt found in session");
  }
  let receipt = conversation.session.current_receipt;

  let json_receipt: ReceiptData = {
    patient_name: receipt.patient_name,
    vendor_name: receipt.vendor_name,
    issue_date: receipt.issue_date!.toISOString().split("T")[0],
    total_amount: receipt.total_amount,
    bill_type: receipt.bill_type,
  };

  json_receipt = await conversation.external(() =>
    editReceiptData(json_receipt, ctx.message?.text)
  );

  await ctx.reply(receiptDataToMarkdown(json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: inlineKeyboard,
  });

  receipt = await conversation.external(() =>
    prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        patient_name: json_receipt.patient_name,
        vendor_name: json_receipt.vendor_name,
        issue_date: json_receipt.issue_date
          ? dateStringToISO(json_receipt.issue_date)
          : null,
        total_amount: json_receipt.total_amount,
        bill_type: json_receipt.bill_type,
      },
    })
  );

  conversation.session.current_receipt = receipt;
}

// Main conversation function
async function receiptScan(conversation: MyConversation, ctx: MyContext) {
  await processScan(conversation, ctx);

  const response = await conversation.waitForCallbackQuery(
    ["/save", "/cancel"],
    {
      otherwise: async (ctx) => await processEdit(conversation, ctx),
    }
  );

  if (!conversation.session.current_receipt) {
    throw new Error("No receipt found in session");
  }

  if (response.match === "/save") {
    await ctx.reply("Receipt saved!");
    await prisma.receipt.update({
      where: { id: conversation.session.current_receipt.id },
      data: { processed: true },
    });
    return;
  }
  if (response.match === "/cancel") {
    await ctx.reply("Receipt discarded!");
    await prisma.receipt.delete({
      where: { id: conversation.session.current_receipt.id },
    });
    return;
  }
}

const ReceiptScanConvo = createConversation(receiptScan);

export default ReceiptScanConvo;
