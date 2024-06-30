import { type FunctionDeclaration, FunctionDeclarationSchemaType, GoogleGenerativeAI } from "@google/generative-ai";
import { type FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";

import type { ReceiptData, ReceiptHistory } from "@/types";

// Set up Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Gemini API key is required");
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Model instructions
const receiptScanningInstructions = `
You are a tax accountant helping users with tallying receipts. 

The user will give you a picture of a paper receipt in Japanese. You will analyze the content and extract:
- the patient's name, as patient_name
- the name of the clinic or pharmacy, as vendor_name
- the date of the receipt formatted as YYYY-MM-DD, as issue_date
- the total amount in JPY, as an integer, as total_amount
- the type of receipt, as bill_type, can only be 
    - "TREATMENT" for a doctor's visit or hospital treatment
    - "PRESCRIPTION" for a pharmacy purchase
    - "OTHER" for any other type of receipt such as transportation

If the issue date is in Japanese, convert it to YYYY-MM-DD. 令和６年 is 2024.

As part of the user prompt, you will receive lists of values used in the past by the user.
Use them to enhance your character recognition.

Return the extracted data as a json object using this schema:
{
  "patient_name": string,
  "vendor_name": string,
  "issue_date": string,
  "total_amount": number,
  "bill_type": "TREATMENT" | "PRESCRIPTION" | "OTHER"
}
`;

const editInstructions = `
You will be given a json object with extracted receipt data.
The user will ask you to edit the data. You will return the edited json object.

Additional instructions:
- issue_date must be in the format YYYY-MM-DD
- total_amount must be an integer
- bill_type can only be "TREATMENT", "PRESCRIPTION", or "OTHER"
`;

// Model function declarations
const saveToDatabase: FunctionDeclaration = {
  name: "saveToDatabase",
  description: "Save the receipt data to a database",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      patient_name: { type: FunctionDeclarationSchemaType.STRING },
      vendor_name: { type: FunctionDeclarationSchemaType.STRING },
      issue_date: {
        type: FunctionDeclarationSchemaType.STRING,
        format: "YYYY-MM-DD",
      },
      total_amount: { type: FunctionDeclarationSchemaType.INTEGER },
      bill_type: {
        type: FunctionDeclarationSchemaType.STRING,
        enum: ["TREATMENT", "PRESCRIPTION", "OTHER"],
      },
    },
  },
};

// Model utility functions for file management
async function uploadToGemini(path: string, mimeType: string) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

async function waitForFilesActive(files: FileMetadataResponse[]) {
  console.log("Waiting for file processing...");
  for (const name of files.map((file) => file.name)) {
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name);
    }
    if (file.state !== "ACTIVE") {
      throw Error(`File ${file.name} failed to process`);
    }
  }
  console.log("...all files ready\n");
}

// Model configuration
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// Model initialization
const receiptScanningModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  systemInstruction: receiptScanningInstructions,
  // tools: [{ functionDeclarations: [saveToDatabase] }],
  // toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  generationConfig: generationConfig,
});

const editModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  systemInstruction: editInstructions,
  // tools: [{ functionDeclarations: [saveToDatabase] }],
  // toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  generationConfig: generationConfig,
});

// Function to scan a receipt image
export async function scanReceipt(path: string, history: ReceiptHistory): Promise<ReceiptData> {
  const mimeType = "image/jpeg";
  const files = [await uploadToGemini(path, mimeType)];
  await waitForFilesActive(files);

  const patientList = history.patient_names.map((name) => `- ${name}`).join("\n");
  const vendorList = history.vendor_names.map((name) => `- ${name}`).join("\n");
  const text_prompt = `Patient names:\n${patientList}\n\nVendor names:\n${vendorList}`;
  console.log("Scan Prompt:", text_prompt);

  const result = await receiptScanningModel.generateContent([
    { fileData: { fileUri: files[0]!.uri, mimeType: files[0]!.mimeType } },
    text_prompt,
  ]);

  console.log("Gemini token count:", result.response.usageMetadata?.totalTokenCount);

  try {
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Error parsing JSON from Gemini response:", error);
    throw new Error("Error parsing JSON from Gemini response");
  }
}

// Function to edit receipt data
export async function editReceiptData(data: ReceiptData, userPrompt: string | undefined): Promise<ReceiptData> {
  if (!userPrompt) {
    return data;
  }

  const prompt = `JSON data to edit:\n${JSON.stringify(data, null, 2)}\n\nUser Prompt:\n${userPrompt}`;
  console.log("Edit Prompt:", prompt);

  const result = await editModel.generateContent(prompt);

  console.log("Gemini token count:", result.response.usageMetadata?.totalTokenCount);

  try {
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Error parsing JSON from Gemini response:", error);
    throw new Error("Error parsing JSON from Gemini response");
  }
}
