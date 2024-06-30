import OpenAI from "openai";

import type { ReceiptData, ReceiptHistory } from "@/types";

import { filePathToBase64String, generateHistoryPrompt } from "./utils";

const openai = new OpenAI();

const scanPrompt = `
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

The user will also provide you with a history of patient and vendor names seen in the past that you can use 
to enhance your character recognition.

Return the extracted data as a json object using this schema:
{
  "patient_name": string,
  "vendor_name": string,
  "issue_date": string,
  "total_amount": number,
  "bill_type": "TREATMENT" | "PRESCRIPTION" | "OTHER"
}
`;

const editPrompt = `
You will be given a json object with extracted receipt data.
The user will ask you to edit the data. You will return the edited json object.

Additional instructions:
- issue_date must be in the format YYYY-MM-DD
- total_amount must be an integer
- bill_type can only be "TREATMENT", "PRESCRIPTION", or "OTHER"
`;

export async function scanReceipt(path: string, history: ReceiptHistory): Promise<ReceiptData> {
  const image_data = filePathToBase64String(path);
  const text_prompt = generateHistoryPrompt(history);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: scanPrompt,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image_data } },
          { type: "text", text: text_prompt },
        ],
      },
    ],
  });

  if (!response.choices[0].message.content) {
    throw new Error("No response from OpenAI");
  }

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Invalid response from OpenAI");
  }
}

export async function editReceiptData(data: ReceiptData, userPrompt: string | undefined): Promise<ReceiptData> {
  if (!userPrompt) {
    return data;
  }

  const prompt = `JSON data to edit:\n${JSON.stringify(data, null, 2)}\n\nUser Prompt:\n${userPrompt}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: editPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (!response.choices[0].message.content) {
    throw new Error("No response from OpenAI");
  }

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Invalid response from OpenAI");
  }
}
