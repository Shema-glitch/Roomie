/**
 * Roomie Flat Privacy & Guardrail Utilities
 * Enforces client-side security checks against sensitive personal identity documents
 * (passports, national IDs, driver licenses, SSNs) before data reaches Supabase.
 */

export const IDENTITY_DOCUMENT_REGEX =
  /(passport|national[ _-]?id|visa[ _-]?num|ssn|social\s+security|id\s*card|kimlik|driver'?s?\s*license)/i;

export function containsIdentityDocument(text?: string | null): boolean {
  if (!text) return false;
  return IDENTITY_DOCUMENT_REGEX.test(text);
}

export function assertNoIdentityDocument(text?: string | null, fieldName = 'Field'): void {
  if (containsIdentityDocument(text)) {
    throw new Error(
      `${fieldName} contains prohibited identity document references. Passports, national IDs, and driver's licenses are strictly disallowed for roomie privacy.`
    );
  }
}
