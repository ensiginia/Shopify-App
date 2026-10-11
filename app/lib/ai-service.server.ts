import db from "../db.server";
import { createAIService } from "./ai-service-core.server";
export const aiService = createAIService(db);
