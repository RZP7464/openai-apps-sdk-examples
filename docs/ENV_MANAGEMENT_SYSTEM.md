# Environment Variables Management System

## Overview

This document describes the comprehensive Environment Variables Management System that allows administrators to manage application configuration dynamically through a database-backed interface.

## Features

### 1. Database-Backed Configuration
- All environment variables stored in PostgreSQL database
- Dynamic loading and updating without server restart
- Persistent storage with full CRUD operations
- Version tracking with timestamps

### 2. Security Features
- **Secret Masking**: Sensitive values automatically masked in responses
- **Category-Based Organization**: Group related variables together
- **Audit Trail**: Track creation and update timestamps
- **Selective Exposure**: Control which values are visible

### 3. Admin Interface
- **Beautiful UI**: Modern, responsive design with Tailwind CSS
- **Category Filtering**: View variables by category
- **CRUD Operations**: Create, read, update, and delete variables
- **Real-time Updates**: Instant UI feedback
- **Search & Filter**: Find variables quickly

### 4. API Endpoints
- RESTful API design
- Full CRUD support
- Bulk update capabilities
- Category management

## Database Schema

### Table: `env_variables`

```sql
CREATE TABLE env_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_env_key ON env_variables(key);
CREATE INDEX idx_env_category ON env_variables(category);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `key`: Environment variable name (unique)
- `value`: Variable value (TEXT for long values)
- `description`: Human-readable description
- `is_secret`: Flag to mask value in responses
- `category`: Grouping category (server, auth, payment, etc.)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

### Default Values

The system initializes with these default variables:

| Key | Category | Secret | Description |
|-----|----------|--------|-------------|
| PORT | server | No | Server port number |
| HOST | server | No | Server host |
| JWT_SECRET | auth | Yes | JWT secret key for token signing |
| JWT_EXPIRY | auth | No | JWT token expiry time |
| RAZORPAY_KEY_ID | payment | No | Razorpay API Key ID |
| RAZORPAY_KEY_SECRET | payment | Yes | Razorpay API Key Secret |
| DB_CONNECT_URL | database | Yes | Database connection string |
| CORS_ALLOW_ORIGIN | server | No | CORS allowed origins |
| CORS_ALLOW_METHODS | server | No | CORS allowed HTTP methods |
| CORS_ALLOW_HEADERS | server | No | CORS allowed headers |

## Backend Implementation

### 1. EnvService (`pizzaz_server_node/src/services/env.service.ts`)

Comprehensive service for managing environment variables:

**Key Methods:**

```typescript
// Get all environment variables (secrets masked by default)
static async getAllEnvVariables(includeSecrets: boolean = false): Promise<EnvVariable[]>

// Get variables by category
static async getEnvVariablesByCategory(category: string, includeSecrets: boolean = false): Promise<EnvVariable[]>

// Get specific variable
static async getEnvVariable(key: string, includeSecret: boolean = false): Promise<EnvVariable | null>

// Get value only (internal use)
static async getEnvValue(key: string): Promise<string | null>

// Create new variable
static async createEnvVariable(key: string, value: string, description: string, isSecret: boolean, category: string): Promise<EnvVariable>

// Update variable
static async updateEnvVariable(id: string, updates: object): Promise<EnvVariable>

// Delete variable
static async deleteEnvVariable(id: string): Promise<boolean>

// Get all categories
static async getCategories(): Promise<string[]>

// Get as key-value object (internal use)
static async getEnvAsObject(): Promise<Record<string, string>>

// Bulk update
static async bulkUpdateEnvVariables(updates: Array<{key: string, value: string}>): Promise<number>
```

**Security Features:**
- Automatic secret masking (returns '••••••••' for secret values)
- Explicit opt-in for viewing secrets
- Transaction support for bulk operations
- Comprehensive error handling

### 2. EnvRoutes (`pizzaz_server_node/src/routes/env.routes.ts`)

RESTful route handlers for all operations:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/env` | Get all environment variables |
| GET | `/api/admin/env/categories` | Get all categories |
| GET | `/api/admin/env/category/:category` | Get variables by category |
| GET | `/api/admin/env/:key` | Get specific variable by key |
| POST | `/api/admin/env` | Create new variable |
| PUT | `/api/admin/env/:id` | Update variable |
| DELETE | `/api/admin/env/:id` | Delete variable |
| POST | `/api/admin/env/bulk-update` | Bulk update variables |

### 3. Database Initialization

The `env_variables` table is automatically created on server startup with default values inserted.

## API Documentation

### GET /api/admin/env

Get all environment variables (secrets masked).

**Response:**
```json
{
  "success": true,
  "envVariables": [
    {
      "id": "7dd28aa1-276b-47e6-ab22-6ce846c84236",
      "key": "JWT_EXPIRY",
      "value": "7d",
      "description": "JWT token expiry time",
      "isSecret": false,
      "category": "auth",
      "createdAt": "2026-01-02T05:15:47.275Z",
      "updatedAt": "2026-01-02T05:15:47.275Z"
    },
    {
      "id": "7838d549-99e9-4422-a900-fad3bcf7d5a4",
      "key": "JWT_SECRET",
      "value": "••••••••",
      "description": "JWT secret key for token signing",
      "isSecret": true,
      "category": "auth",
      "createdAt": "2026-01-02T05:15:47.275Z",
      "updatedAt": "2026-01-02T05:15:47.275Z"
    }
  ]
}
```

### GET /api/admin/env/categories

Get all unique categories.

**Response:**
```json
{
  "success": true,
  "categories": ["auth", "database", "payment", "server", "test"]
}
```

### POST /api/admin/env

Create a new environment variable.

**Request:**
```json
{
  "key": "NEW_VAR",
  "value": "new_value",
  "description": "Description of the variable",
  "isSecret": false,
  "category": "general"
}
```

**Response (201):**
```json
{
  "success": true,
  "envVariable": {
    "id": "28df90c4-8291-492b-9239-7c86b9cbafd9",
    "key": "NEW_VAR",
    "value": "new_value",
    "description": "Description of the variable",
    "isSecret": false,
    "category": "general",
    "createdAt": "2026-01-02T05:19:55.912Z",
    "updatedAt": "2026-01-02T05:19:55.912Z"
  }
}
```

### PUT /api/admin/env/:id

Update an existing environment variable.

**Request:**
```json
{
  "value": "updated_value",
  "description": "Updated description",
  "isSecret": true,
  "category": "updated_category"
}
```

**Response:**
```json
{
  "success": true,
  "envVariable": {
    "id": "28df90c4-8291-492b-9239-7c86b9cbafd9",
    "key": "NEW_VAR",
    "value": "••••••••",
    "description": "Updated description",
    "isSecret": true,
    "category": "updated_category",
    "createdAt": "2026-01-02T05:19:55.912Z",
    "updatedAt": "2026-01-02T05:20:18.890Z"
  }
}
```

### DELETE /api/admin/env/:id

Delete an environment variable.

**Response:**
```json
{
  "success": true,
  "message": "Environment variable deleted successfully"
}
```

### POST /api/admin/env/bulk-update

Update multiple variables at once.

**Request:**
```json
{
  "updates": [
    {"key": "VAR1", "value": "value1"},
    {"key": "VAR2", "value": "value2"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 environment variable(s) updated successfully",
  "updatedCount": 2
}
```

## Frontend Implementation

### Admin Environment Page (`admin-env.html`)

**Features:**

1. **Variable Display**
   - Grouped by category
   - Color-coded secret badges
   - Masked values for secrets
   - Timestamps for tracking

2. **Category Filter**
   - Dropdown to filter by category
   - "All Categories" option
   - Count of displayed variables

3. **Create/Edit Modal**
   - Form validation
   - Key (required, unique)
   - Value (required, text area)
   - Description (optional)
   - Category (optional, defaults to 'general')
   - Secret checkbox

4. **Delete Confirmation**
   - Warning modal
   - Shows variable key
   - Prevents accidental deletion

5. **User Experience**
   - Loading states
   - Error handling
   - Success feedback
   - Responsive design

## Usage Guide

### Accessing the Admin Panel

```
http://localhost:8000/admin/env
```

### Creating a New Variable

1. Click "Add New" button
2. Enter variable key (e.g., `NEW_API_KEY`)
3. Enter value
4. Add description (optional but recommended)
5. Choose category
6. Check "Mark as secret" if sensitive
7. Click "Save"

### Editing a Variable

1. Find the variable in the list
2. Click "Edit" button
3. Modify fields (key cannot be changed)
4. Click "Save"

### Deleting a Variable

1. Find the variable in the list
2. Click "Delete" button
3. Confirm deletion in modal
4. Variable is permanently removed

### Filtering by Category

1. Use the category dropdown
2. Select a category to filter
3. Select "All Categories" to show all

## Security Considerations

### Current Implementation

✅ **Secret Masking**
- Values marked as secret show '••••••••'
- Cannot be retrieved via standard API
- Protects sensitive data in responses

✅ **Database Security**
- PostgreSQL with connection pooling
- Parameterized queries prevent SQL injection
- UUID primary keys prevent enumeration

✅ **Input Validation**
- Required field validation
- Unique key constraint
- Error handling for all operations

### Recommended Enhancements

⚠️ **For Production:**

1. **Admin Authentication**
   ```typescript
   // Add admin role check middleware
   if (!req.user || req.user.role !== 'admin') {
     return sendErrorResponse(res, 403, "Unauthorized");
   }
   ```

2. **Encryption at Rest**
   ```typescript
   // Encrypt secret values before storing
   const encryptedValue = encrypt(value, ENCRYPTION_KEY);
   ```

3. **Audit Logging**
   ```typescript
   // Log all env variable changes
   await logAuditEvent({
     action: 'ENV_UPDATE',
     adminId: req.adminId,
     key: envVar.key,
     timestamp: new Date()
   });
   ```

4. **Rate Limiting**
   ```typescript
   // Limit env variable API requests
   if (await isRateLimited(req.ip, 'env-api')) {
     return sendErrorResponse(res, 429, "Too many requests");
   }
   ```

5. **Change Notifications**
   ```typescript
   // Notify on critical env changes
   if (isCriticalEnvVar(key)) {
     await notifyAdmins(`Environment variable ${key} was modified`);
   }
   ```

## Integration with Application

### Loading Configuration

To use database-backed env variables in your application:

```typescript
import { EnvService } from './services/env.service.js';

// Load all env variables as object
const envConfig = await EnvService.getEnvAsObject();

// Access specific values
const jwtSecret = await EnvService.getEnvValue('JWT_SECRET');

// Update config object
config.jwt.secret = jwtSecret || config.jwt.secret;
```

### Hot Reload Support

For configuration hot reload without restart:

```typescript
// Periodically reload configuration
setInterval(async () => {
  const updatedConfig = await EnvService.getEnvAsObject();
  // Update application config
  Object.assign(config, updatedConfig);
}, 60000); // Every minute
```

## Testing Results

### API Endpoints

✅ **GET /api/admin/env**
- Returns all variables
- Secrets properly masked
- Correct data structure

✅ **POST /api/admin/env**
- Creates new variable
- Validates required fields
- Returns created variable

✅ **PUT /api/admin/env/:id**
- Updates existing variable
- Handles partial updates
- Updates timestamp

✅ **DELETE /api/admin/env/:id**
- Deletes variable
- Returns success message
- Handles not found error

✅ **GET /api/admin/env/categories**
- Returns unique categories
- Sorted alphabetically

### Database Operations

✅ **Table Creation**
- Automatically created on startup
- Indexes created successfully
- Default values inserted

✅ **CRUD Operations**
- All operations tested
- Transactions work correctly
- Error handling functional

## Files Created/Modified

### Created:
- `pizzaz_server_node/src/services/env.service.ts` - Environment service
- `pizzaz_server_node/src/routes/env.routes.ts` - API routes
- `admin-env.html` - Admin interface
- `docs/ENV_MANAGEMENT_SYSTEM.md` - This documentation

### Modified:
- `pizzaz_server_node/src/database/init.ts` - Added env_variables table
- `pizzaz_server_node/src/server.ts` - Added routes and endpoints
- `pizzaz_server_node/src/routes/static.routes.ts` - Added env page server
- `admin-users.html` - Added Environment tab
- `admin-orders.html` - Added Environment tab

## Future Enhancements

1. **Environment Profiles**: Different configs for dev/staging/prod
2. **Version History**: Track all changes with rollback capability
3. **Import/Export**: Bulk import from .env files
4. **Validation Rules**: Custom validation per variable
5. **Required Variables**: Mark critical variables as required
6. **Default Values**: Fallback values if not set
7. **Variable Dependencies**: Define relationships between variables
8. **Environment Sync**: Sync with external config services
9. **Backup/Restore**: Automated backups of configuration
10. **Change Approval**: Require approval for production changes

## Troubleshooting

### Issue: Cannot see secret values

**Solution:** Secret values are intentionally masked. To access them:
- Use `EnvService.getEnvValue(key)` in backend code
- Secrets are never exposed in API responses for security

### Issue: Variable not updating

**Solution:**
- Check if variable exists in database
- Verify the ID is correct
- Check server logs for errors
- Ensure database connection is active

### Issue: Duplicate key error

**Solution:**
- Variable keys must be unique
- Delete existing variable or use different key
- Use update endpoint instead of create

## Conclusion

The Environment Variables Management System provides a robust, secure, and user-friendly way to manage application configuration dynamically. With database persistence, secret masking, and a beautiful admin interface, it's ready for development use and can be hardened for production with the recommended security enhancements.

