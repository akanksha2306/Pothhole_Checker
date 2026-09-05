/** Route-local param schemas (request bodies/queries live in `shared`). */
import { z } from 'zod';

export const ReportIdParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export type ReportIdParams = z.infer<typeof ReportIdParamsSchema>;

/** Potholes are addressable by internal id or by human code (BLR-00001). */
export const IdOrHumanCodeParamsSchema = z.object({
  idOrHumanCode: z.string().min(1, 'idOrHumanCode is required'),
});

export type IdOrHumanCodeParams = z.infer<typeof IdOrHumanCodeParamsSchema>;

export const RepairIdParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export type RepairIdParams = z.infer<typeof RepairIdParamsSchema>;

/** Evidence photo routes: stage is constrained so it can index the repair row. */
export const RepairEvidenceParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
  stage: z.enum(['before', 'after']),
});

export type RepairEvidenceParams = z.infer<typeof RepairEvidenceParamsSchema>;
