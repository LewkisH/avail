/**
 * Environment variable validation
 * Validates critical environment variables on application startup
 */

import { validateEnvVar, validateApiKey } from './input-validation';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Gemini API key configuration
 */
export function validateGeminiConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const apiKey = validateEnvVar('GEMINI_API_KEY');
    
    try {
      validateApiKey(apiKey, 30); // Gemini API keys are typically longer
    } catch (error: any) {
      errors.push(`GEMINI_API_KEY validation failed: ${error.message}`);
    }
  } catch (error: any) {
    errors.push(error.message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all critical environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];
  
  for (const varName of requiredVars) {
    try {
      validateEnvVar(varName);
    } catch (error: any) {
      errors.push(error.message);
    }
  }
  
  // Optional but recommended variables
  const optionalVars = [
    'GEMINI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];
  
  for (const varName of optionalVars) {
    try {
      validateEnvVar(varName);
    } catch (error: any) {
      warnings.push(`${varName} is not set - related features may not work`);
    }
  }
  
  // Validate Gemini API key if set
  if (process.env.GEMINI_API_KEY) {
    const geminiValidation = validateGeminiConfig();
    errors.push(...geminiValidation.errors);
    warnings.push(...geminiValidation.warnings);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log environment validation results
 */
export function logEnvironmentValidation(): void {
  const result = validateEnvironment();
  
  if (result.errors.length > 0) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }
}

/**
 * Check if Gemini API is properly configured
 */
export function isGeminiConfigured(): boolean {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return false;
    
    validateApiKey(apiKey, 30);
    return true;
  } catch {
    return false;
  }
}
