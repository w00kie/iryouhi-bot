import type { Context, SessionFlavor } from "grammy";
import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { FileFlavor } from "@grammyjs/files";
import type { User, Receipt } from "@prisma/client";

interface SessionData {
  dbuser?: User;
  current_receipt?: Receipt;
}

export type MyContext = FileFlavor<
  Context & SessionFlavor<SessionData> & ConversationFlavor
>;
export type MyConversation = Conversation<MyContext>;
