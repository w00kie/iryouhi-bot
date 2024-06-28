import {
  GoogleGenerativeAI,
  FunctionDeclarationSchemaType,
  type FunctionDeclaration,
  type GenerateContentRequest,
  FunctionCallingMode,
} from "@google/generative-ai";
import {
  GoogleAIFileManager,
  type FileMetadataResponse,
} from "@google/generative-ai/server";

/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 *
 * See the getting started guide for more information
 * https://ai.google.dev/gemini-api/docs/get-started/node
 */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Gemini API key is required");
}

const editInstructions = `
You will be given a json object with extracted receipt data.
The user will ask you to edit the data. You will return the edited json object.

Additional instructions:
- issue_date must be in the format YYYY-MM-DD
- total_amount must be an integer
- bill_type can only be "TREATMENT", "PRESCRIPTION", or "OTHER"
`;

const saveToDatabase: FunctionDeclaration = {
  name: "saveToDatabase",
  description: "Save the extracted receipt data to a database",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      patient_name: { type: FunctionDeclarationSchemaType.STRING },
      vendor_name: { type: FunctionDeclarationSchemaType.STRING },
      issue_date: {
        type: FunctionDeclarationSchemaType.STRING,
        format: "YYYY/MM/DD",
      },
      total_amount: { type: FunctionDeclarationSchemaType.INTEGER },
      bill_type: {
        type: FunctionDeclarationSchemaType.STRING,
        enum: ["TREATMENT", "PRESCRIPTION", "OTHER"],
      },
    },
  },
};

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const model = genAI.getGenerativeModel(
  {
    model: "gemini-1.5-flash-latest",
    systemInstruction: editInstructions,
    generationConfig: generationConfig,
    // tools: [{ functionDeclarations: [saveToDatabase] }],
    // toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
  },
  { apiVersion: "v1beta" }
);

const prompt = `JSON data to edit:
{
  "patient_name": "ルッコラ 渚苑",
  "vendor_name": "白金歯周歯列矯正クリニック",
  "issue_date": "2024-03-28",
  "total_amount": 780,
  "bill_type": "TREATMENT"
}

User Prompt:
patient name is ルジュテ海老原 史奈 and bill type is taxi`;

async function run() {
  const result = await model.generateContent(prompt);

  console.log("Response text:", result.response.text());
  // const call = result.response.functionCalls()![0];
  // if (call) {
  //   console.log("Function call:", call.args);
  // }
}

run();
