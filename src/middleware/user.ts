import type { NextFunction } from "grammy";

import prisma from "../prismadb";
import type { MyContext } from "../types";

export async function registerUser(ctx: MyContext, next: NextFunction): Promise<void> {
  if (!ctx.from || ctx.session.dbuser_id) {
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
    ctx.session.dbuser_id = user.id;
  } catch (e) {
    console.log(e);
  }

  await next();
}
