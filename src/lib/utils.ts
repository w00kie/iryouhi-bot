import { randomBytes } from "crypto";
import fs from "fs";

import prisma from "@/prismadb";
import { type FullReceipt, FullReceiptArraySchema, type ReceiptData, type ReceiptHistory } from "@/types";

export function dateStringToISO(dateString: string): string {
  return new Date(dateString).toISOString();
}

export function receiptDataToMarkdown(data: ReceiptData): string {
  return `
*Patient name*: ${data.patient_name}
*Vendor name*: ${data.vendor_name}
*Issue date*: ${data.issue_date.toISOString().split("T")[0].replaceAll("-", "\\-")}
*Total amount*: ${data.total_amount}¥
*Bill type*: ${data.bill_type}
`;
}

export async function generateReceiptsHistory(user_id: number): Promise<ReceiptHistory> {
  const patient_names = await prisma.receipt.findMany({
    select: { patient_name: true },
    where: { user_id: user_id, processed: true },
    distinct: ["patient_name"],
  });
  const vendor_names = await prisma.receipt.findMany({
    select: { vendor_name: true },
    where: { user_id: user_id, processed: true },
    distinct: ["vendor_name"],
  });

  return {
    patient_names: patient_names.map((item) => item.patient_name),
    vendor_names: vendor_names.map((item) => item.vendor_name),
  };
}

export function filePathToBase64String(filePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const imageBase64 = imageBuffer.toString("base64");
    return `data:image/jpeg;base64,${imageBase64}`;
  } catch (error) {
    throw new Error("Error reading image file");
  }
}

export function generateHistoryPrompt(history: ReceiptHistory): string {
  const patientList = history.patient_names.map((name) => `- ${name}`).join("\n");
  const vendorList = history.vendor_names.map((name) => `- ${name}`).join("\n");
  return `Patient names:\n${patientList}\n\nVendor names:\n${vendorList}`;
}

export async function getReceiptsForYear(user_id: number, year: number): Promise<FullReceipt[]> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const receipts = await prisma.receipt.findMany({
    where: { user_id: user_id, processed: true, issue_date: { gte: startDate, lt: endDate } },
  });

  return FullReceiptArraySchema.parse(receipts);
}

// Function to generate a random string
export function generateRandomString(length: number): string {
  return randomBytes(length).toString("hex").slice(0, length);
}
