import { type GeneratePasswordInput, type GeneratedPassword } from '../schema';
import { randomBytes } from 'crypto';

export const generatePassword = async (input: GeneratePasswordInput): Promise<GeneratedPassword> => {
  try {
    const charset = buildCharset(input);
    
    if (charset.length === 0) {
      throw new Error('No character types selected for password generation');
    }

    const password = generateSecurePassword(input.length, charset);
    const strength = calculatePasswordStrength(password, input);
    
    return {
      password: password,
      strength: strength
    };
  } catch (error) {
    console.error('Password generation failed:', error);
    throw error;
  }
};

// Helper function to build character set based on input preferences
function buildCharset(input: GeneratePasswordInput): string {
  let charset = '';
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (input.include_lowercase) charset += lowercase;
  if (input.include_uppercase) charset += uppercase;
  if (input.include_numbers) charset += numbers;
  if (input.include_symbols) charset += symbols;
  
  if (input.exclude_ambiguous) {
    // Remove ambiguous characters: 0 (zero), O (capital o), l (lowercase L), I (capital i), 1 (one)
    charset = charset.replace(/[0Ol1Il]/g, '');
  }
  
  return charset;
}

// Helper function to generate cryptographically secure random password
function generateSecurePassword(length: number, charset: string): string {
  const password = new Array(length);
  const charsetLength = charset.length;
  
  // Use crypto.randomBytes for cryptographically secure randomness
  const randomValues = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    // Use modulo to map random byte to charset index
    password[i] = charset[randomValues[i] % charsetLength];
  }
  
  return password.join('');
}

// Helper function to calculate password strength
function calculatePasswordStrength(
  password: string, 
  input: GeneratePasswordInput
): 'weak' | 'fair' | 'good' | 'strong' | 'very_strong' {
  let score = 0;
  const length = password.length;
  
  // Length scoring
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;
  
  // Character variety scoring
  let charTypes = 0;
  if (input.include_lowercase) charTypes++;
  if (input.include_uppercase) charTypes++;
  if (input.include_numbers) charTypes++;
  if (input.include_symbols) charTypes++;
  
  // Bonus points for character variety
  if (charTypes >= 2) score += 1;
  if (charTypes >= 3) score += 1;
  if (charTypes >= 4) score += 1;
  
  // Additional length bonus for very long passwords
  if (length >= 24) score += 1;
  
  // Map score to strength levels
  if (score <= 1) return 'weak';
  if (score <= 3) return 'fair';
  if (score <= 5) return 'good';
  if (score <= 7) return 'strong';
  return 'very_strong';
}