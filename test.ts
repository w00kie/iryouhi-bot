import prisma from "@/prismadb";
import { dateStringToISO, receiptDataToMarkdown } from "@/lib/utils";

// const receipt = await prisma.receipt.create({
//   data: {
//     user_id: 2,
//     patient_name: "John Doe",
//     vendor_name: "Cocokara Fine",
//     issue_date: "2024-03-28T00:00:00.000Z",
//     total_amount: 780,
//     bill_type: "PRESCRIPTION",
//   },
// });

// console.log("Receipt saved:", receipt);
console.log(dateStringToISO("2024-03-28"));
console.log("2024-03-28".replaceAll("-", "\\-"));

const names = await prisma.receipt.findMany({
  select: { patient_name: true },
  where: { user_id: 2 },
  distinct: ["patient_name"],
});

console.log(names);
