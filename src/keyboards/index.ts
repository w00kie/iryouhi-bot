import { InlineKeyboard } from "grammy";

// Define an inline keyboard with two buttons
export const ReceiptValidationKeyboard = new InlineKeyboard().text("Save", "/save").text("Cancel", "/cancel");
