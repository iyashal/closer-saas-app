import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8080'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  RECALL_API_KEY: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().default(''),
  STRIPE_STARTER_ANNUAL_PRICE_ID: z.string().default(''),
  STRIPE_SOLO_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_SOLO_ANNUAL_PRICE_ID: z.string().min(1),
  STRIPE_TEAM_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_TEAM_ANNUAL_PRICE_ID: z.string().min(1),
  BILLING_PORTAL_RETURN_URL: z.string().default('http://localhost:5173/settings/billing'),
  CHECKOUT_SUCCESS_URL: z.string().default('http://localhost:5173/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
  CHECKOUT_CANCEL_URL: z.string().default('http://localhost:5173/settings/billing?checkout=canceled'),

  RESEND_API_KEY: z.string().min(1),

  ZOOM_CLIENT_ID: z.string().default(''),
  ZOOM_CLIENT_SECRET: z.string().default(''),
  ZOOM_REDIRECT_URI: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
