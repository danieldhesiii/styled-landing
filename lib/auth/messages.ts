export function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) return "Confirm your email before signing in. You can resend the confirmation below.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "That email and password don't match.";
  if (m.includes("already") || m.includes("in use")) return "That email may already have an account. Try logging in or recovering access.";
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) return "Please wait a little before trying again. Check your inbox and spam folder for an earlier email.";
  if (m.includes("password")) return "Your password could not be accepted. Use at least 6 characters and follow any account password requirements.";
  if (m.includes("email") && m.includes("valid")) return "Please enter a valid email address.";
  return "We couldn't complete that action. Check your connection and try again, or contact support@styleduk.com.";
}
