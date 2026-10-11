import db from "../db.server";
import { createAbService } from "./ab-lifecycle.server";
export { AB_SCOPES } from "./ab-lifecycle.server";
export const { abStore, reconcile, workspace, mutate } = createAbService(db);
