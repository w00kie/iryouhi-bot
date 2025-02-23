import { createConversation } from "@grammyjs/conversations";
import Debug from "debug";

import { enqueueJob } from "@/lib/jobQueue";
import refineReceiptJob from "@/lib/jobs/refineReceipt";
import scanReceiptJob from "@/lib/jobs/scanReceipt";
import prisma from "@/prismadb";
import { type MyConversation, type MyConversationContext } from "@/types";

const debug = Debug("bot:receipt");

// Function to process the receipt scan
async function processScan(conversation: MyConversation, convoCtx: MyConversationContext) {
  await conversation.external((ctx) =>
    enqueueJob({
      type: "scanAndStore",
      jobFunction: scanReceiptJob,
      payload: { ctx },
    }),
  );
  await convoCtx.reply("Processing receipt...");
}

// Function to process any text edits
async function processEdit(conversation: MyConversation, convoCtx: MyConversationContext) {
  await conversation.external((ctx) =>
    enqueueJob({ type: "refineReceipt", jobFunction: refineReceiptJob, payload: { ctx } }),
  );
  await convoCtx.reply("Processing your edits...");
}

// Main conversation function
async function receiptScan(conversation: MyConversation, ctx: MyConversationContext) {
  const session = await conversation.external((ctx) => ctx.session);

  await processScan(conversation, ctx);

  const response = await conversation.waitForCallbackQuery(["/save", "/cancel"], {
    otherwise: async (ctx) => await processEdit(conversation, ctx),
  });

  if (!session.current_receipt) {
    throw new Error("No receipt found in session");
  }

  if (response.match === "/save") {
    await conversation.external(() => debug("Saving receipt %d", session.current_receipt?.id));

    await conversation.external(() =>
      prisma.receipt.update({
        where: { id: session.current_receipt?.id },
        data: { processed: true },
      }),
    );

    await ctx.reply("Receipt saved!");
    return;
  }

  if (response.match === "/cancel") {
    await conversation.external(() => debug("Discarding receipt %d", session.current_receipt?.id));

    await conversation.external(() =>
      prisma.receipt.delete({
        where: { id: session.current_receipt?.id },
      }),
    );

    await ctx.reply("Receipt discarded!");
    return;
  }
}

const ReceiptScanConvo = createConversation(receiptScan);

export default ReceiptScanConvo;
