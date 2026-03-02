/**
 * Default sensitive field names to redact
 */
const DEFAULT_SENSITIVE_FIELDS = [
  "password",
  "token",
  "apikey",
  "api_key",
  "secret",
  "authorization",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "private_key",
];

/**
 * Sanitize sensitive data by replacing values with '[REDACTED]'
 *
 * @param data - Data to sanitize (object, array, or primitive)
 * @param sensitiveFields - Additional field names to redact (case-insensitive)
 * @returns Sanitized copy of the data
 */
export function sanitizeData(data: any, sensitiveFields: string[] = []): any {
  /**
   * Sanitize Data
   *
   * @param {any} data - The data to process
   * @param {string[]} sensitiveFields=[] - Array of sensitive fields
   * @returns {any} The any
   */
  /**
   * Sanitize Data
   *
   * @param {any} data - The data to process
   * @param {string[]} sensitiveFields=[] - Array of sensitive fields
   * @returns {any} The any
   */
  if (!data || typeof data !== "object") {
    return data;
  }

  const allSensitiveFields = [
    ...DEFAULT_SENSITIVE_FIELDS,
    ...sensitiveFields.map((f) => f.toLowerCase()),
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    if (allSensitiveFields.some((field) => lowerKey.includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key], sensitiveFields);
    }
  }

  return sanitized;
}

/**
 * Sanitize URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
  /**
   * Sanitize Url
   *
   * @param {string} url - The url
   * @returns {string} String result
   */
  /**
   * Sanitize Url
   *
   * @param {string} url - The url
   * @returns {string} String result
   */
  try {
    const urlObj = new URL(url);
    const sensitiveParams = [
      "token",
      "apikey",
      "api_key",
      "secret",
      "password",
    ];

    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, "[REDACTED]");
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}
