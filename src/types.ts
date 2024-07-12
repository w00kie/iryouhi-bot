import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { FileFlavor } from "@grammyjs/files";
import type { Receipt, User } from "@prisma/client";
import type { Buffer as ExcelJSBuffer } from "exceljs";
import type { Context, SessionFlavor } from "grammy";
import { z } from "zod";

interface SessionData {
  dbuser_id?: number;
  current_receipt?: Receipt;
}

export type MyContext = FileFlavor<Context & SessionFlavor<SessionData> & ConversationFlavor>;
export type MyConversation = Conversation<MyContext>;

export const ReceiptDataSchema = z.object({
  patient_name: z.string(),
  vendor_name: z.string(),
  issue_date: z.coerce.date(),
  total_amount: z.coerce.number().int(),
  bill_type: z.enum(["PRESCRIPTION", "TREATMENT", "OTHER"]),
});

export type BillType = z.infer<typeof ReceiptDataSchema>["bill_type"];

export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

export interface ReceiptHistory {
  patient_names: (string | null)[];
  vendor_names: (string | null)[];
}
