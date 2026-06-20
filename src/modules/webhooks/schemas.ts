import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string()).min(1).default(['document.completed']),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});
