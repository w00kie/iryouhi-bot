import { createConversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";

import { editReceiptData, scanReceipt } from "@/lib/openai";
import { storeReceiptImage } from "@/lib/r2storage";
import { dateStringToISO, generateReceiptsHistory, receiptDataToMarkdown } from "@/lib/utils";
import prisma from "@/prismadb";
import type { MyContext, MyConversation, ReceiptData } from "@/types";

// Define an inline keyboard with two buttons
const inlineKeyboard = new InlineKeyboard().text("Save", "/save").text("Cancel", "/cancel");

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

  const history = await generateReceiptsHistory(user_id);

  const [json_receipt, storage_key] = await Promise.all([
    conversation.external(() => scanReceipt(path, history)),
    conversation.external(() => storeReceiptImage(path, user_id)),
  ]);

  const receipt = await conversation.external(() =>
    prisma.receipt.create({
      data: {
        user_id: user_id,
        storage_url: storage_key,
        patient_name: json_receipt.patient_name,
        vendor_name: json_receipt.vendor_name,
        issue_date: json_receipt.issue_date ? dateStringToISO(json_receipt.issue_date) : null,
        total_amount: json_receipt.total_amount,
        bill_type: json_receipt.bill_type,
      },
    }),
  );

  // Send the receipt data as a markdown message
  await ctx.reply(receiptDataToMarkdown(json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: inlineKeyboard,
  });

  await ctx.reply("Use the buttons above or tell me what to edit.");

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

  json_receipt = await conversation.external(() => editReceiptData(json_receipt, ctx.message?.text));

  // Update the receipt in the database
  receipt = await conversation.external(() =>
    prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        patient_name: json_receipt.patient_name,
        vendor_name: json_receipt.vendor_name,
        issue_date: json_receipt.issue_date ? dateStringToISO(json_receipt.issue_date) : null,
        total_amount: json_receipt.total_amount,
        bill_type: json_receipt.bill_type,
      },
    }),
  );

  // Send the updated receipt data as a markdown message
  await ctx.reply(receiptDataToMarkdown(json_receipt), {
    parse_mode: "MarkdownV2",
    reply_markup: inlineKeyboard,
  });

  conversation.session.current_receipt = receipt;
}

// Main conversation function
async function receiptScan(conversation: MyConversation, ctx: MyContext) {
  await processScan(conversation, ctx);

  const response = await conversation.waitForCallbackQuery(["/save", "/cancel"], {
    otherwise: async (ctx) => await processEdit(conversation, ctx),
  });

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
