/**
 * Email validation utility that matches backend validation logic
 * This ensures consistent validation between frontend and backend
 */

/**
 * Validates email format using the same rules as the backend
 * @param email - The email address to validate
 * @returns true if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email || !email.includes('@')) {
    return false;
  }
  
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  
  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return false;
  }
  
  // Check for minimum domain requirements
  if (!domain.includes('.')) {
    return false;
  }
  
  // Check that domain has a proper name (not just dots)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return false;
  }
  
  // Check that each domain part has content
  for (const part of domainParts) {
    if (!part || part.length < 1) {
      return false;
    }
  }
  
  // Check for minimum email length (a@b.c is too short)
  if (email.length < 6) {
    return false;
  }
  
  // Check for double dots in local part
  if (localPart.includes('..')) {
    return false;
  }
  
  // Check for spaces
  if (email.includes(' ')) {
    return false;
  }
  
  // Check for leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }
  
  // Check for leading/trailing dashes in domain parts
  for (const part of domainParts) {
    if (part.startsWith('-') || part.endsWith('-')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Gets a user-friendly error message for email validation failures
 * @returns A localized error message
 */
export const getEmailValidationErrorMessage = (): string => {
  return 'Voer een geldig e-mailadres in (bijvoorbeeld: gebruiker@school.nl)';
};

/**
 * Test cases for email validation
 * These match the backend test cases to ensure consistency
 */
export const EMAIL_VALIDATION_TEST_CASES = {
  valid: [
    'user@example.com',
    'user.name@example.com',
    'user+tag@example.com',
    'user@subdomain.example.com',
    'user@example.co.uk',
    'user@example.org',
    'user123@example.com'
  ],
  invalid: [
    '', // Empty string
    'invalid-email', // No @ symbol
    '@example.com', // No local part
    'user@', // No domain
    'user@.com', // No domain name
    'user..name@example.com', // Double dots in local part
    'user@example..com', // Double dots in domain
    'user@example', // No TLD
    'user name@example.com', // Space in local part
    'user@example com', // Space in domain
    'a@b.c', // Too short
    '.user@example.com', // Leading dot in local part
    'user@-example.com', // Leading dash in domain
    'user@example-.com' // Trailing dash in domain
  ]
};
