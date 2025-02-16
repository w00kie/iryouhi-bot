import type { BundlerPayload } from "@/types";

import { getReceiptsForYear } from "./utils";

const BUNDLER_URL = process.env.BUNDLER_URL;

if (!BUNDLER_URL) {
  throw new Error("Bundler URL is required");
}

export async function bundleReceipts(user_id: number, year: number): Promise<Buffer> {
  const receipts = await getReceiptsForYear(user_id, year);

  const payload: BundlerPayload = {
    archive_filename: `receipts_${year}.zip`,
    files: receipts.map((item) => ({
      r2key: item.storage_url,
      filename: `${item.patient_name}_${item.vendor_name}_${item.issue_date.toISOString().split("T")[0]}.jpg`,
    })),
  };

  const response = await fetch(`${BUNDLER_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id, year }),
  });

  if (!response.ok) {
    throw new Error(`Failed to bundle receipts: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
