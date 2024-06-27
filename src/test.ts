import prisma from "./prismadb";

const user = await prisma.user.upsert({
  where: { telegram_id: 123456789 },
  update: {},
  create: { telegram_id: 123456789, username: "testuser" },
});

console.log(user);
