/**
 * Environment Configuration
 * Validates and exports required environment variables
 */

const requiredEnvVars = {
  RESEND_API_KEY: "Email service API key",
  JWT_SECRET: "JWT signing secret",
  CHATTERBOX_POSTGRES_URL: "PostgreSQL database connection URL",
};

const optionalEnvVars = {
  PORT: { default: 3000, description: "Server port" },
  NODE_ENV: { default: "development", description: "Environment mode" },
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
function validateEnvironment() {
  const missing = [];

  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missing.push(`${key} (${description})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\n` +
        "Please set these environment variables before starting the application."
    );
  }
}

/**
 * Gets environment variable with optional default
 * @param {string} key - Environment variable key
 * @param {any} defaultValue - Default value if not set
 * @returns {string|number} Environment variable value
 */
function getEnvVar(key, defaultValue = undefined) {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  // Convert numeric strings to numbers
  if (typeof defaultValue === "number" && !isNaN(value)) {
    return parseInt(value, 10);
  }

  return value;
}

// Validate environment on module load
validateEnvironment();

// Export configuration object
export const config = {
  // Required variables
  resendApiKey: process.env.RESEND_API_KEY,
  jwtSecret: process.env.JWT_SECRET,
  postgresUrl: process.env.CHATTERBOX_POSTGRES_URL,

  // Optional variables with defaults
  port: getEnvVar("PORT", optionalEnvVars.PORT.default),
  nodeEnv: getEnvVar("NODE_ENV", optionalEnvVars.NODE_ENV.default),

  // Computed values
  isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
  isProduction: getEnvVar("NODE_ENV", "development") === "production",
};

export default config;
