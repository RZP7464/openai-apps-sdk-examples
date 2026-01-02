import { EnvService } from "../services/env.service.js";

/**
 * Dynamic configuration loader that fetches values from database
 * Falls back to process.env and default values
 */

// Cache for config values to avoid repeated database calls
let configCache: Record<string, string> = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get configuration value from database with fallback
 */
export async function getConfigValue(key: string, defaultValue: string = ''): Promise<string> {
  try {
    // Check cache first
    const now = Date.now();
    if (configCache[key] && (now - lastCacheUpdate) < CACHE_TTL) {
      return configCache[key];
    }

    // Try to get from database
    const dbValue = await EnvService.getEnvValue(key);
    if (dbValue !== null) {
      configCache[key] = dbValue;
      lastCacheUpdate = now;
      return dbValue;
    }

    // Fallback to process.env
    const envValue = process.env[key];
    if (envValue) {
      return envValue;
    }

    // Return default value
    return defaultValue;
  } catch (error) {
    console.error(`Error getting config value for ${key}:`, error);
    // Fallback to process.env or default
    return process.env[key] || defaultValue;
  }
}

/**
 * Load all configuration from database
 */
export async function loadConfig(): Promise<Record<string, string>> {
  try {
    const envVars = await EnvService.getEnvAsObject();
    configCache = envVars;
    lastCacheUpdate = Date.now();
    return envVars;
  } catch (error) {
    console.error('Error loading config from database:', error);
    return {};
  }
}

/**
 * Clear configuration cache (useful for hot reload)
 */
export function clearConfigCache() {
  configCache = {};
  lastCacheUpdate = 0;
}

/**
 * Get configuration object with all values
 */
export async function getConfig() {
  try {
    // Refresh cache if expired
    const now = Date.now();
    if ((now - lastCacheUpdate) > CACHE_TTL || Object.keys(configCache).length === 0) {
      await loadConfig();
    }

    return {
      // Server Configuration
      port: parseInt(await getConfigValue('PORT', '8000')),
      host: await getConfigValue('HOST', '0.0.0.0'),
      
      // Database Configuration
      database: {
        connectionString: await getConfigValue('DB_CONNECT_URL', 
          "postgresql://n8n_db_m3i6_user:rQ5Npj6UW6MswIiceNFYN4gFJLxr8rnL@dpg-d4o02mvgi27c73drclb0-a.oregon-postgres.render.com/n8n_db_m3i6"),
        ssl: {
          rejectUnauthorized: false
        }
      },
      
      // JWT Configuration
      jwt: {
        secret: await getConfigValue('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
        expiry: await getConfigValue('JWT_EXPIRY', '7d')
      },
      
      // Razorpay Configuration
      razorpay: {
        keyId: await getConfigValue('RAZORPAY_KEY_ID', 'rzp_live_I51bxdyuOOsDA7'),
        keySecret: await getConfigValue('RAZORPAY_KEY_SECRET', '')
      },
      
      // CORS Configuration
      cors: {
        allowOrigin: await getConfigValue('CORS_ALLOW_ORIGIN', '*'),
        allowMethods: await getConfigValue('CORS_ALLOW_METHODS', 'GET, POST, OPTIONS'),
        allowHeaders: await getConfigValue('CORS_ALLOW_HEADERS', 'content-type, authorization')
      }
    };
  } catch (error) {
    console.error('Error building config object:', error);
    // Return default config if database is unavailable
    return getDefaultConfig();
  }
}

/**
 * Get default configuration (fallback when database is unavailable)
 */
function getDefaultConfig() {
  return {
    port: parseInt(process.env.PORT || '8000'),
    host: process.env.HOST || '0.0.0.0',
    database: {
      connectionString: process.env.DB_CONNECT_URL || 
        "postgresql://n8n_db_m3i6_user:rQ5Npj6UW6MswIiceNFYN4gFJLxr8rnL@dpg-d4o02mvgi27c73drclb0-a.oregon-postgres.render.com/n8n_db_m3i6",
      ssl: {
        rejectUnauthorized: false
      }
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      expiry: '7d'
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_live_I51bxdyuOOsDA7',
      keySecret: process.env.RAZORPAY_KEY_SECRET || ''
    },
    cors: {
      allowOrigin: '*',
      allowMethods: 'GET, POST, OPTIONS',
      allowHeaders: 'content-type, authorization'
    }
  };
}

export default {
  getConfigValue,
  loadConfig,
  clearConfigCache,
  getConfig,
  getDefaultConfig
};

