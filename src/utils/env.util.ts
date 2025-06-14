/**
 * Environment Utilities
 * Helper functions for environment variable handling
 */

export const getEnvVar = (key: string, defaultValue?: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }
  return defaultValue || '';
};

export const getEnvVarAsNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const getEnvVarAsBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key).toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') {
    return true;
  }
  if (value === 'false' || value === '0' || value === 'no') {
    return false;
  }
  return defaultValue;
};

export const isProduction = (): boolean => {
  return getEnvVar('NODE_ENV') === 'production';
};

export const isDevelopment = (): boolean => {
  return getEnvVar('NODE_ENV') === 'development' || getEnvVar('NODE_ENV') === '';
};

export const isTest = (): boolean => {
  return getEnvVar('NODE_ENV') === 'test';
};