import {
  GoogleGenerativeAI,
  FunctionDeclarationSchemaType,
  type FunctionDeclaration,
  FunctionCallingMode,
} from "@google/generative-ai";
import {
  GoogleAIFileManager,
  type FileMetadataResponse,
} from "@google/generative-ai/server";

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
    - "CONSULTATION" for a doctor's visit or hospital treatment
    - "PRESCRIPTION" for a pharmacy purchase
    - "OTHER" for any other type of receipt such as transportation

If the issue date is in Japanese, convert it to YYYY-MM-DD. 令和６年 is 2024.

As part of the user prompt, you will receive lists of values used in the past by the user.
Use them to enhance your character recognition.
`;

const editInstructions = `
You will be given a json object with extracted receipt data.
The user will ask you to edit the data. You must save the edited json object to the database.

Additional instructions:
- issue_date should be in the format YYYY-MM-DD
- total_amount should be an integer
- bill_type can only be "CONSULTATION", "PRESCRIPTION", or "OTHER"
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
        enum: ["CONSULTATION", "PRESCRIPTION", "OTHER"],
      },
    },
  },
};

export interface ReceiptData {
  patient_name: string | null;
  vendor_name: string | null;
  issue_date: string | null;
  total_amount: number | null;
  bill_type: string | null;
}

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
};

// Model initialization
const receiptScanningModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: receiptScanningInstructions,
  tools: [{ functionDeclarations: [saveToDatabase] }],
  toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  generationConfig: generationConfig,
});

const editModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: editInstructions,
  tools: [{ functionDeclarations: [saveToDatabase] }],
  toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  generationConfig: generationConfig,
});

export interface ReceiptHistory {
  patient_names: (string | null)[];
  vendor_names: (string | null)[];
}

// Function to scan a receipt image
export async function scanReceipt(
  path: string,
  history: ReceiptHistory
): Promise<ReceiptData> {
  const mimeType = "image/jpeg";
  const files = [await uploadToGemini(path, mimeType)];
  await waitForFilesActive(files);

  const patientList = history.patient_names
    .map((name) => `- ${name}`)
    .join("\n");
  const vendorList = history.vendor_names.map((name) => `- ${name}`).join("\n");
  const text_prompt = `Patient names:\n${patientList}\n\nVendor names:\n${vendorList}`;
  console.log("Scan Prompt:", text_prompt);

  const result = await receiptScanningModel.generateContent([
    { fileData: { fileUri: files[0]!.uri, mimeType: files[0]!.mimeType } },
    text_prompt,
  ]);

  console.log(
    "Gemini token count:",
    result.response.usageMetadata?.totalTokenCount
  );

  const call = result.response.functionCalls()![0];
  if (call) {
    console.log("Function call:", call.args);
    return call.args as ReceiptData;
  } else {
    throw new Error("No function call found in Gemini response");
  }
}

// Function to edit receipt data
export async function editReceiptData(
  data: ReceiptData,
  userPrompt: string | undefined
): Promise<ReceiptData> {
  if (!userPrompt) {
    return data;
  }

  const prompt = `JSON data to edit:\n${JSON.stringify(
    data,
    null,
    2
  )}\n\nUser Prompt:\n${userPrompt}`;
  console.log("Edit Prompt:", prompt);

  const result = await editModel.generateContent(prompt);

  console.log(
    "Gemini token count:",
    result.response.usageMetadata?.totalTokenCount
  );

  const call = result.response.functionCalls()![0];
  if (call) {
    console.log("Function call:", call.args);
    return call.args as ReceiptData;
  } else {
    throw new Error("No function call found in Gemini response");
  }
}