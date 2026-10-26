/** Supabase supplies stable error codes; text-only errors remain supported. */
export function authError(error: unknown): string {
  const details =
    error && typeof error === "object"
      ? (error as { message?: unknown; code?: unknown; status?: unknown })
      : {};
  const message =
    typeof error === "string"
      ? error
      : typeof details.message === "string"
        ? details.message
        : "";
  const code = typeof details.code === "string" ? details.code : "";
  const m = message.toLowerCase();
  if (
    code === "over_email_send_rate_limit" ||
    /email.*rate limit|rate limit.*email/.test(m)
  )
    return "Account emails are temporarily unavailable because our email service has reached its sending limit. Please try again later or contact support@styleduk.com. If you already have an account, choose Log in.";
  if (
    code === "email_address_not_authorized" ||
    /email address not authorized/.test(m)
  )
    return "Our account email service is not yet able to send to this address. Please contact support@styleduk.com so we can resolve the delivery setup.";
  if (/error sending.*email|error sending.*mail|smtp/.test(m))
    return "We couldn't send the account email. Please try again later or contact support@styleduk.com.";
  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Confirm your email before signing in. You can resend the confirmation below.";
  if (
    code === "invalid_credentials" ||
    m.includes("invalid login") ||
    m.includes("invalid credentials")
  )
    return "That email and password don't match.";
  if (
    ["email_exists", "user_already_exists"].includes(code) ||
    m.includes("already") ||
    m.includes("in use")
  )
    return "That email may already have an account. Try logging in or recovering access.";
  if (
    code === "over_request_rate_limit" ||
    details.status === 429 ||
    /rate limit|too many|seconds/.test(m)
  )
    return "Too many attempts. Please wait before trying again.";
  if (m.includes("password"))
    return "Your password could not be accepted. Use at least 6 characters and follow any account password requirements.";
  if (
    code === "email_address_invalid" ||
    (m.includes("email") && m.includes("valid"))
  )
    return "Please enter a valid email address.";
  return "We couldn't complete that action. Check your connection and try again, or contact support@styleduk.com.";
}
