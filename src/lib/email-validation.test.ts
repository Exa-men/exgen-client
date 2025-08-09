/**
 * Test file for email validation
 * This ensures frontend validation matches backend validation
 */

import { validateEmail, EMAIL_VALIDATION_TEST_CASES } from './email-validation';

// Test the validation function
describe('Email Validation', () => {
  test('should validate correct emails', () => {
    EMAIL_VALIDATION_TEST_CASES.valid.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  test('should reject invalid emails', () => {
    EMAIL_VALIDATION_TEST_CASES.invalid.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  test('should handle edge cases', () => {
    // Test specific edge cases
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('test')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@test.com')).toBe(false);
    expect(validateEmail('test@.com')).toBe(false);
    expect(validateEmail('test..test@example.com')).toBe(false);
    expect(validateEmail('test@example..com')).toBe(false);
    expect(validateEmail('test@-example.com')).toBe(false);
    expect(validateEmail('test@example-.com')).toBe(false);
    expect(validateEmail('test name@example.com')).toBe(false);
    expect(validateEmail('test@example com')).toBe(false);
    expect(validateEmail('a@b.c')).toBe(false); // Too short
    expect(validateEmail('.test@example.com')).toBe(false);
    expect(validateEmail('test.@example.com')).toBe(false);
  });

  test('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name@example.com')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
    expect(validateEmail('user@subdomain.example.com')).toBe(true);
    expect(validateEmail('user@example.co.uk')).toBe(true);
    expect(validateEmail('user123@example.com')).toBe(true);
    expect(validateEmail('test@school.nl')).toBe(true);
  });
});

// Manual test function for quick verification
export const runEmailValidationTests = () => {
  console.log('Running Email Validation Tests...');
  
  const testCases = [
    // Invalid cases (should return false)
    { email: 'user@.com', expected: false },
    { email: 'a@b.c', expected: false },
    { email: 'user..name@example.com', expected: false },
    { email: '.user@example.com', expected: false },
    { email: 'user@-example.com', expected: false },
    { email: 'user@example-.com', expected: false },
    { email: 'user name@example.com', expected: false },
    { email: 'user@example com', expected: false },
    
    // Valid cases (should return true)
    { email: 'user@example.com', expected: true },
    { email: 'user.name@example.com', expected: true },
    { email: 'user+tag@example.com', expected: true },
    { email: 'user@subdomain.example.com', expected: true },
    { email: 'user@example.co.uk', expected: true },
    { email: 'user123@example.com', expected: true },
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(({ email, expected }) => {
    const result = validateEmail(email);
    const status = result === expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${email} -> ${result} (expected: ${expected})`);
    
    if (result === expected) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return { passed, failed };
};
