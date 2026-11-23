import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.RESEND_FROM_EMAIL);
}

export function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
