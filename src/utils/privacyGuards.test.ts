import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { containsIdentityDocument, assertNoIdentityDocument } from './privacyGuards';

describe('privacyGuards', () => {
  it('detects prohibited identity document keywords', () => {
    assert.equal(containsIdentityDocument('Here is my passport number 12345'), true);
    assert.equal(containsIdentityDocument('Landlord needs your id card copy'), true);
    assert.equal(containsIdentityDocument('TRNC kimlik no: 998877'), true);
    assert.equal(containsIdentityDocument('Upload driver license photo'), true);
    assert.equal(containsIdentityDocument('ssn: 000-11-2222'), true);
  });

  it('allows normal apartment instructions and notes', () => {
    assert.equal(containsIdentityDocument('Superintendent Hasan phone number'), false);
    assert.equal(containsIdentityDocument('Balcony door sliding latch loose'), false);
    assert.equal(containsIdentityDocument('Rent due on the 1st of every month'), false);
    assert.equal(containsIdentityDocument(null), false);
    assert.equal(containsIdentityDocument(''), false);
  });

  it('assertNoIdentityDocument throws informative error', () => {
    assert.throws(
      () => assertNoIdentityDocument('passport: A9988', 'Condition note'),
      /Condition note contains prohibited identity document references/
    );
    assert.doesNotThrow(() => assertNoIdentityDocument('Sofa in clean condition', 'Condition note'));
  });
});
