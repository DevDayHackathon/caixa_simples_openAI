import { z } from "zod";
import { businessSchema, transactionSchema, cashSnapshotSchema, dateSchema } from "@/contracts";

// Additional experience endpoint; FinancePort v1 remains unchanged.
export const workspaceInputSchema = z.strictObject({ as_of: dateSchema.optional() });
export const workspaceSchema = z.strictObject({ business: businessSchema, transactions: z.array(transactionSchema), snapshot: cashSnapshotSchema });
export type FinanceWorkspace = z.infer<typeof workspaceSchema>;
