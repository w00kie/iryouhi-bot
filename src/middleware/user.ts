import type { NextFunction } from "grammy";
import type { MyContext } from "../types";
import prisma from "../prismadb";

export async function registerUser(
  ctx: MyContext,
  next: NextFunction
): Promise<void> {
  if (!ctx.from || ctx.session.dbuser) {
    await next();
    return;
  }

  const { id, username } = ctx.from;

  try {
    const user = await prisma.user.upsert({
      where: { telegram_id: id },
      update: {},
      create: { telegram_id: id, username },
    });
    ctx.session.dbuser = user;
  } catch (e) {
    console.log(e);
  }

  await next();
}
