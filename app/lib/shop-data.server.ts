import db from "../db.server";

export async function eraseShopData(shop: string) {
  await db.$transaction(async tx => {
    await tx.abExperiment.deleteMany({ where: { shop } });
    await tx.abRefund.deleteMany({ where: { shop } });
    await tx.abAudit.deleteMany({ where: { shop } });
    await tx.aiPage.deleteMany({ where: { shop } });
    await tx.aiGeneration.deleteMany({ where: { shop } });
    await tx.aiImage.deleteMany({ where: { shop } });
    await tx.aiAccount.deleteMany({ where: { shop } });
    await tx.resourceEntry.deleteMany({ where: { shop } });
    await tx.session.deleteMany({ where: { shop } });
  });
}
