import ExcelJS from "exceljs";
import path from "path";

import prisma from "@/prismadb";
import type { BillType } from "@/types";

import { storeReportFile } from "./r2storage";
import { getReceiptsForYear } from "./utils";

const WORKSHEET_INDEX = 1;
const START_ROW = 9;

const SELECTED = "該当する";

const PATIENT_NAME_COLUMN = "B";
const VENDOR_NAME_COLUMN = "C";
const BILL_AMOUNT_COLUMN = "H";
const BILL_DATE_COLUMN = "J";
const MAP_BILL_TYPE_TO_COLUMN = {
  TREATMENT: "D",
  PRESCRIPTION: "E",
  OTHER: "G",
};

function getBillTypeColumn(bill_type: string | null) {
  try {
    return MAP_BILL_TYPE_TO_COLUMN[bill_type as BillType];
  } catch (error) {
    return MAP_BILL_TYPE_TO_COLUMN.OTHER;
  }
}

export async function generateExcelFile(user_id: number, year: number): Promise<Buffer> {
  const receipts = await getReceiptsForYear(user_id, year);

  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join(__dirname, "template", "iryouhi_form_v3.xlsx");
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(WORKSHEET_INDEX);

  if (!worksheet) throw new Error("Worksheet not found");

  receipts.forEach((item, index) => {
    if (!item.bill_type || !item.issue_date) return;
    const row = worksheet.getRow(START_ROW + index);
    row.getCell(PATIENT_NAME_COLUMN).value = item.patient_name;
    row.getCell(VENDOR_NAME_COLUMN).value = item.vendor_name;
    row.getCell(getBillTypeColumn(item.bill_type)).value = SELECTED;
    row.getCell(BILL_AMOUNT_COLUMN).value = item.total_amount;
    row.getCell(BILL_DATE_COLUMN).value = item.issue_date.toISOString().split("T")[0];
  });

  return workbook.xlsx.writeBuffer() as unknown as Buffer;
  // return storeReportFile(reportBuffer, user_id, year);
}
