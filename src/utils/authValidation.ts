export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

export interface PasswordRuleStatus {
  id: 'length' | 'upper' | 'lower' | 'number';
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  rules: PasswordRuleStatus[];
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const BLOCKED_DOMAINS = new Set(['example.com', 'test.com', 'mailinator.com', 'tempmail.com']);

export function validateEmail(rawEmail: string): EmailValidationResult {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { valid: false, error: 'Please enter your email address.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { valid: false, error: 'Enter a valid email address (e.g. name@domain.com).' };
  }
  const domain = email.split('@')[1];
  if (!domain || domain.includes('..') || BLOCKED_DOMAINS.has(domain)) {
    return { valid: false, error: 'Please use a real personal or university email domain.' };
  }
  return { valid: true };
}

export function validatePassword(password: string): PasswordValidationResult {
  const rules: PasswordRuleStatus[] = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /\d/.test(password) },
  ];

  const unmet = rules.find((r) => !r.met);
  return {
    valid: !unmet,
    rules,
    error: unmet ? `Password must include: ${unmet.label.toLowerCase()}.` : undefined,
  };
}

/**
 * Lightweight local-only hash so dev passwords are not stored verbatim in localStorage.
 */
export function hashLocalPassword(email: string, password: string): string {
  const input = `${email.trim().toLowerCase()}::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `lh_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}
