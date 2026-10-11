import { PrismaClient } from "@prisma/client";
const [shop, amount] = process.argv.slice(2),
  credits = Number(amount);
if (
  !shop ||
  !/^(?:[a-z0-9-]+\.myshopify\.com|local\.preview)$/.test(shop) ||
  !Number.isInteger(credits) ||
  credits < 1 ||
  credits > 1000
)
  throw new Error(
    "Usage: npm run ai:credits -- <shop.myshopify.com|local.preview> <1–1000>. Grants internal app credits; no Shopify payment is created.",
  );
const db = new PrismaClient();
try {
  const account = await db.aiAccount.findUnique({ where: { shop } });
  if (!account) throw new Error("Open AI Pages for this shop first.");
  const result = await db.aiAccount.update({
    where: { shop },
    data: { balance: { increment: credits } },
  });
  console.log(
    JSON.stringify({
      shop,
      granted: credits,
      balance: result.balance,
      paymentCreated: false,
    }),
  );
} finally {
  await db.$disconnect();
}
