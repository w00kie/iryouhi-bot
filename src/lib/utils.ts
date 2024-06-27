import type { ReceiptData, ReceiptHistory } from "./gemini";
import type { Receipt } from "@prisma/client";
import prisma from "@/prismadb";

export function dateStringToISO(dateString: string): string {
  return new Date(dateString).toISOString();
}

export function receiptDataToMarkdown(data: ReceiptData): string {
  return `
*Patient name*: ${data.patient_name}
*Vendor name*: ${data.vendor_name}
*Issue date*: ${data.issue_date ? data.issue_date.replaceAll("-", "\\-") : ""}
*Total amount*: ${data.total_amount}¥
*Bill type*: ${data.bill_type}
`;
}

export async function generateReceiptsHistory(
  user_id: number
): Promise<ReceiptHistory> {
  const patient_names = await prisma.receipt.findMany({
    select: { patient_name: true },
    where: { user_id: user_id, patient_name: { not: null }, processed: true },
    distinct: ["patient_name"],
  });
  const vendor_names = await prisma.receipt.findMany({
    select: { vendor_name: true },
    where: { user_id: user_id, vendor_name: { not: null }, processed: true },
    distinct: ["vendor_name"],
  });

  return {
    patient_names: patient_names.map((item) => item.patient_name),
    vendor_names: vendor_names.map((item) => item.vendor_name),
  };
}
