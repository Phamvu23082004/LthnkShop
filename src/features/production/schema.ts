import { z } from "zod";

export const reportInputSchema = z.object({
  completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000),
  lines: z.array(z.object({
    component_id: z.uuid(),
    product_id: z.uuid(),
    component_color: z.string().trim().max(100),
    size: z.string().trim().regex(/^[0-9]{1,3}$/, "Kích thước chỉ nhập số centimet."),
    quantity: z.number().int().min(1).max(10000),
  }).strict()).min(1).max(50),
}).strict();

export type ReportInput = z.infer<typeof reportInputSchema>;

export const datePattern = /^\d{4}-\d{2}-\d{2}$/;
