import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { FileFlavor } from "@grammyjs/files";
import type { Receipt, User } from "@prisma/client";
import type { Buffer as ExcelJSBuffer } from "exceljs";
import type { Context, SessionFlavor } from "grammy";

interface SessionData {
  dbuser_id?: number;
  current_receipt?: Receipt;
}

export type MyContext = FileFlavor<Context & SessionFlavor<SessionData> & ConversationFlavor>;
export type MyConversation = Conversation<MyContext>;

export interface ReceiptData {
  patient_name: string | null;
  vendor_name: string | null;
  issue_date: string | null;
  total_amount: number | null;
  bill_type: string | null;
}

export interface ReceiptHistory {
  patient_names: (string | null)[];
  vendor_names: (string | null)[];
}

export type BillType = "PRESCRIPTION" | "TREATMENT" | "OTHER";
