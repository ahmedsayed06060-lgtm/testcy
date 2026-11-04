import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address').max(255);
export const passwordSchema = z.string().min(12, 'Use at least 12 characters').max(128).regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number').regex(/[^A-Za-z0-9]/, 'Add a symbol');
export const totpSchema = z.string().regex(/^\d{6}$/, 'Enter the six-digit authentication code');
export const scopeTargetSchema = z.string().trim().min(1).max(500).refine((value) => !/\s/.test(value) && !value.startsWith('-'), 'Enter a valid target without spaces or CLI options');
