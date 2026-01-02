import pool from "../database/pool.js";

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export class EnvService {
  /**
   * Get all environment variables
   * @param includeSecrets - Whether to include secret values (masked by default)
   */
  static async getAllEnvVariables(includeSecrets: boolean = false): Promise<EnvVariable[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          key, 
          value,
          description, 
          is_secret as "isSecret", 
          category,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM env_variables
        ORDER BY category, key
      `);

      return result.rows.map(row => ({
        ...row,
        // Mask secret values unless explicitly requested
        value: row.isSecret && !includeSecrets ? '••••••••' : row.value
      }));
    } catch (error: any) {
      console.error("Error fetching env variables:", error);
      throw new Error("Failed to fetch environment variables");
    }
  }

  /**
   * Get environment variables by category
   */
  static async getEnvVariablesByCategory(category: string, includeSecrets: boolean = false): Promise<EnvVariable[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          key, 
          value,
          description, 
          is_secret as "isSecret", 
          category,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM env_variables
        WHERE category = $1
        ORDER BY key
      `, [category]);

      return result.rows.map(row => ({
        ...row,
        value: row.isSecret && !includeSecrets ? '••••••••' : row.value
      }));
    } catch (error: any) {
      console.error("Error fetching env variables by category:", error);
      throw new Error("Failed to fetch environment variables");
    }
  }

  /**
   * Get a specific environment variable by key
   */
  static async getEnvVariable(key: string, includeSecret: boolean = false): Promise<EnvVariable | null> {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          key, 
          value,
          description, 
          is_secret as "isSecret", 
          category,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM env_variables
        WHERE key = $1
      `, [key]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        value: row.isSecret && !includeSecret ? '••••••••' : row.value
      };
    } catch (error: any) {
      console.error("Error fetching env variable:", error);
      throw new Error("Failed to fetch environment variable");
    }
  }

  /**
   * Get environment variable value (for internal use)
   */
  static async getEnvValue(key: string): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT value FROM env_variables WHERE key = $1',
        [key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].value;
    } catch (error: any) {
      console.error("Error fetching env value:", error);
      return null;
    }
  }

  /**
   * Create a new environment variable
   */
  static async createEnvVariable(
    key: string,
    value: string,
    description: string = '',
    isSecret: boolean = false,
    category: string = 'general'
  ): Promise<EnvVariable> {
    // Validation
    if (!key) {
      throw new Error("Key is required");
    }

    if (value === undefined || value === null) {
      throw new Error("Value is required");
    }

    try {
      // Check if key already exists
      const existingVar = await pool.query(
        'SELECT id FROM env_variables WHERE key = $1',
        [key]
      );

      if (existingVar.rows.length > 0) {
        throw new Error(`Environment variable '${key}' already exists`);
      }

      const result = await pool.query(`
        INSERT INTO env_variables (key, value, description, is_secret, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING 
          id, 
          key, 
          value,
          description, 
          is_secret as "isSecret", 
          category,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [key, value, description, isSecret, category]);

      const row = result.rows[0];
      return {
        ...row,
        value: row.isSecret ? '••••••••' : row.value
      };
    } catch (error: any) {
      console.error("Error creating env variable:", error);
      if (error.message.includes("already exists")) {
        throw error;
      }
      throw new Error("Failed to create environment variable");
    }
  }

  /**
   * Update an environment variable
   */
  static async updateEnvVariable(
    id: string,
    updates: {
      value?: string;
      description?: string;
      isSecret?: boolean;
      category?: string;
    }
  ): Promise<EnvVariable> {
    // Validation
    if (!id) {
      throw new Error("ID is required");
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("At least one field to update is required");
    }

    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.value !== undefined) {
        updateFields.push(`value = $${paramCount++}`);
        values.push(updates.value);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }

      if (updates.isSecret !== undefined) {
        updateFields.push(`is_secret = $${paramCount++}`);
        values.push(updates.isSecret);
      }

      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramCount++}`);
        values.push(updates.category);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await pool.query(`
        UPDATE env_variables
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          key, 
          value,
          description, 
          is_secret as "isSecret", 
          category,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, values);

      if (result.rows.length === 0) {
        throw new Error("Environment variable not found");
      }

      const row = result.rows[0];
      return {
        ...row,
        value: row.isSecret ? '••••••••' : row.value
      };
    } catch (error: any) {
      console.error("Error updating env variable:", error);
      if (error.message.includes("not found")) {
        throw error;
      }
      throw new Error("Failed to update environment variable");
    }
  }

  /**
   * Delete an environment variable
   */
  static async deleteEnvVariable(id: string): Promise<boolean> {
    // Validation
    if (!id) {
      throw new Error("ID is required");
    }

    try {
      const result = await pool.query(
        'DELETE FROM env_variables WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Environment variable not found");
      }

      return true;
    } catch (error: any) {
      console.error("Error deleting env variable:", error);
      if (error.message.includes("not found")) {
        throw error;
      }
      throw new Error("Failed to delete environment variable");
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const result = await pool.query(`
        SELECT DISTINCT category
        FROM env_variables
        WHERE category IS NOT NULL
        ORDER BY category
      `);

      return result.rows.map(row => row.category);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      throw new Error("Failed to fetch categories");
    }
  }

  /**
   * Get environment variables as key-value object (for internal use)
   */
  static async getEnvAsObject(): Promise<Record<string, string>> {
    try {
      const result = await pool.query(
        'SELECT key, value FROM env_variables'
      );

      const envObject: Record<string, string> = {};
      for (const row of result.rows) {
        envObject[row.key] = row.value;
      }

      return envObject;
    } catch (error: any) {
      console.error("Error fetching env as object:", error);
      return {};
    }
  }

  /**
   * Bulk update environment variables
   */
  static async bulkUpdateEnvVariables(
    updates: Array<{ key: string; value: string }>
  ): Promise<number> {
    if (!updates || updates.length === 0) {
      throw new Error("Updates array is required");
    }

    const client = await pool.connect();
    let updatedCount = 0;

    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const result = await client.query(`
          UPDATE env_variables
          SET value = $1, updated_at = CURRENT_TIMESTAMP
          WHERE key = $2
          RETURNING id
        `, [update.value, update.key]);

        if (result.rows.length > 0) {
          updatedCount++;
        }
      }

      await client.query('COMMIT');
      return updatedCount;
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error("Error bulk updating env variables:", error);
      throw new Error("Failed to bulk update environment variables");
    } finally {
      client.release();
    }
  }
}

export default EnvService;

