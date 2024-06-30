import { PutObjectCommand, type PutObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";

import { generateRandomString } from "./utils";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;

if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  throw new Error("Cloudflare credentials are required");
}

const R2_STORAGE_BUCKET = process.env.R2_STORAGE_BUCKET;
const R2_REPORTS_BUCKET = process.env.R2_REPORTS_BUCKET;
const REPORTS_PREFIX = "Reports";
const RECEIPTS_PREFIX = "Receipts";

if (!R2_STORAGE_BUCKET || !R2_REPORTS_BUCKET) {
  throw new Error("Storage buckets are required");
}

const ENDPOINT = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_REPORTS_BUCKET_URL = process.env.PUBLIC_REPORTS_BUCKET_URL;

enum StorageBucket {
  RECEIPTS = "iryouhi-storage",
  REPORTS = "iryouhi-reports",
}

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export function uploadFile(file: Buffer, key: string, bucket: StorageBucket): Promise<PutObjectCommandOutput> {
  return s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
    }),
  );
}

export async function storeReceiptImage(file: string | Buffer, user_id: number): Promise<string> {
  let fileBuffer: Buffer;
  if (typeof file === "string") {
    fileBuffer = await readFile(file);
  } else {
    fileBuffer = file;
  }

  const key = `${RECEIPTS_PREFIX}/${user_id}/${Date.now()}.jpg`;
  await uploadFile(fileBuffer, key, StorageBucket.RECEIPTS);
  return key;
}

export async function storeReportFile(file: string | Buffer, user_id: number, year: number): Promise<string> {
  let fileBuffer: Buffer;
  if (typeof file === "string") {
    fileBuffer = await readFile(file);
  } else {
    fileBuffer = file;
  }

  const key = `medical_expenses_report_${year}_${generateRandomString(8)}.xlsx`;
  await uploadFile(fileBuffer, key, StorageBucket.REPORTS);
  return `${PUBLIC_REPORTS_BUCKET_URL}/${key}`;
}
