import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { FileFlavor } from "@grammyjs/files";
import type { Receipt } from "@prisma/client";
import type { Context, SessionFlavor } from "grammy";
import { z } from "zod";

export interface SessionData {
  dbuser_id?: number;
  current_receipt?: Receipt;
}

export type MyContext = FileFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
export type MyConversationContext = FileFlavor<Context>;
export type MyConversation = Conversation<MyContext, MyConversationContext>;

export const ReceiptDataSchema = z.object({
  patient_name: z.string(),
  vendor_name: z.string(),
  issue_date: z.coerce.date(),
  total_amount: z.coerce.number().int(),
  bill_type: z.enum(["PRESCRIPTION", "TREATMENT", "OTHER"]),
});

export const FullReceiptSchema = ReceiptDataSchema.extend({ storage_url: z.string() });

export const FullReceiptArraySchema = z.array(FullReceiptSchema);

export type BillType = z.infer<typeof ReceiptDataSchema>["bill_type"];

export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

export type FullReceipt = z.infer<typeof FullReceiptSchema>;

export interface ReceiptHistory {
  patient_names: (string | null)[];
  vendor_names: (string | null)[];
}

export interface BundlerPayload {
  archive_filename: string;
  files: {
    r2key: string;
    filename: string;
  }[];
}
