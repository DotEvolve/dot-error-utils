/**
 * Sanitize sensitive data by replacing values with '[REDACTED]'
 *
 * @param data - Data to sanitize (object, array, or primitive)
 * @param sensitiveFields - Additional field names to redact (case-insensitive)
 * @returns Sanitized copy of the data
 */
export declare function sanitizeData(data: any, sensitiveFields?: string[]): any;
/**
 * Sanitize URL by removing sensitive query parameters
 */
export declare function sanitizeUrl(url: string): string;
