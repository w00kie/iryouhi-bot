import { s3 } from "bun";

const RECEIPTS_PREFIX = "Receipts";

export async function storeReceiptImage(path: string, user_id: number): Promise<string> {
  const file = Bun.file(path);

  const key = `${RECEIPTS_PREFIX}/${user_id}/${Date.now()}.jpg`;

  const s3file = s3.file(key);
  await s3file.write(file);

  return key;
}
