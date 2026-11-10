export function emailProvider(keys: {resendApiKeyIfSet?: string; brevoApiKeyIfSet?: string}): 'resend' | 'brevo' | null {
  // A configured Resend key explicitly moves sending away from the old Brevo account.
  if (keys.resendApiKeyIfSet?.trim()) return 'resend';
  if (keys.brevoApiKeyIfSet?.trim()) return 'brevo';
  return null;
}
