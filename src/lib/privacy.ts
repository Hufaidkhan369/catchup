/**
 * On-device redaction.
 *
 * Runs before anything is written to the summary or an export so OTPs, phone
 * numbers, card numbers and email addresses never leak into shared text.
 * Pure and synchronous so it is easy to test.
 */

const CARD_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g;
const OTP_RE =
  /\b(otp|one[- ]?time|verification|verification code|security code|code)\b[^\d]{0,12}(\d{4,8})\b/gi;
const EMAIL_RE = /\b([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})\b/gi;
const LONG_DIGITS_RE = /\b\d{6,}\b/g;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function looksLikePhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 13;
}

function looksLikeCard(digits: string): boolean {
  // Luhn check keeps false positives (long ids) down.
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

/** Redact sensitive tokens, preserving the last 4 digits where useful. */
export function maskSensitive(text: string): string {
  if (!text) return text;
  let out = text;

  // OTPs first so the surrounding word is still visible.
  out = out.replace(OTP_RE, (_full, label: string, code: string) => {
    return `${label} ${"•".repeat(code.length)}`;
  });

  // Cards (Luhn-valid) -> keep last 4.
  out = out.replace(CARD_RE, (match) => {
    const digits = onlyDigits(match);
    if (!looksLikeCard(digits) && !(digits.length >= 15 && digits.length <= 16)) {
      return match;
    }
    return `•••• ${digits.slice(-4)}`;
  });

  // Phone numbers -> keep last 2.
  out = out.replace(PHONE_RE, (match) => {
    const digits = onlyDigits(match);
    if (!looksLikePhone(digits)) return match;
    return `••••••${digits.slice(-2)}`;
  });

  // Emails -> keep domain.
  out = out.replace(EMAIL_RE, (_full, local: string, domain: string) => {
    const head = local.slice(0, 1);
    return `${head}•••@${domain}`;
  });

  // Any remaining long numeric runs that could still be an OTP/account id.
  out = out.replace(LONG_DIGITS_RE, (digits) => "•".repeat(digits.length));

  return out;
}

/** True when the text contains something worth redacting (for UI hints). */
export function containsSensitive(text: string): boolean {
  return maskSensitive(text) !== text;
}
