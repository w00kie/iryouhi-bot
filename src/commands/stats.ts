import prisma from "@/prismadb";
import type { MyContext } from "@/types";

export async function stats(ctx: MyContext): Promise<void> {
  const user = ctx.session.dbuser;
  if (!user) {
    await ctx.reply("You are not registered.");
    return;
  }

  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const { _count, _sum } = await prisma.receipt.aggregate({
    _count: { id: true },
    _sum: { total_amount: true },
    where: { user_id: user.id, processed: true, issue_date: { gte: startDate, lt: endDate } },
  });

  await ctx.reply(`*Receipts Processed:* ${_count.id}\n*Total Amount:* ${_sum.total_amount}¥`, {
    parse_mode: "MarkdownV2",
  });
}
