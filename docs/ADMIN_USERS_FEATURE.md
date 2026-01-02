# Admin Users Management Feature

## Overview

This document describes the newly implemented Admin Users Management feature that allows administrators to view and monitor all registered users in the system.

## Features

### 1. User Listing
- Display all registered users in a table format
- Show key user information including username, email, and join date
- Display user statistics (total orders, paid orders, total spent)
- Visual indicators for active/inactive users

### 2. User Statistics Dashboard
- **Total Users**: Count of all registered users
- **Active Users**: Users who have placed at least one order
- **Total Orders**: Aggregate count of all orders across users
- **Total Revenue**: Sum of all paid orders

### 3. Navigation
- Tabbed interface to switch between Users and Orders views
- Seamless navigation between admin sections

### 4. Auto-refresh
- Automatic data refresh every 30 seconds
- Manual refresh button for on-demand updates

## Technical Implementation

### Backend Changes

#### 1. Auth Service (`pizzaz_server_node/src/services/auth.service.ts`)

Added new method `getAllUsers()`:
```typescript
static async getAllUsers() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END) as paid_orders,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY u.created_at DESC
    `);

    return result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      totalOrders: parseInt(user.total_orders) || 0,
      paidOrders: parseInt(user.paid_orders) || 0,
      totalSpent: parseInt(user.total_spent) || 0,
    }));
  } catch (error: any) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}
```

**Key Features:**
- Joins users with orders to calculate statistics
- Groups by user ID to aggregate order data
- Returns formatted user objects with computed statistics
- Handles null values gracefully with COALESCE

#### 2. Auth Routes (`pizzaz_server_node/src/routes/auth.routes.ts`)

Added new route handler:
```typescript
static async getAllUsers(req: IncomingMessage, res: ServerResponse) {
  try {
    const users = await AuthService.getAllUsers();
    sendSuccessResponse(res, { success: true, users });
  } catch (error: any) {
    console.error("Get all users error:", error);
    sendErrorResponse(res, 500, error.message);
  }
}
```

#### 3. Server Routes (`pizzaz_server_node/src/server.ts`)

Added new endpoints:
- `GET /api/admin/users` - API endpoint to fetch all users
- `GET /admin/users` - Serves the admin users HTML page

#### 4. Static Routes (`pizzaz_server_node/src/routes/static.routes.ts`)

Added new method `serveAdminUsersPage()` to serve the admin users interface.

### Frontend Changes

#### 1. Admin Users Page (`admin-users.html`)

A new comprehensive admin interface with:

**Header Section:**
- Page title and description
- Manual refresh button
- Navigation tabs (Users/Orders)

**Statistics Cards:**
- Total Users count
- Active Users count (users with orders)
- Total Orders count
- Total Revenue (sum of paid orders)

**Users Table:**
Displays the following columns:
- User (with avatar and active/inactive status)
- Email address
- Join date
- Total Orders count
- Paid Orders count
- Total Spent amount
- User ID (truncated)

**Loading States:**
- Loading spinner while fetching data
- Error state with retry button
- Empty state when no users found

**Auto-refresh:**
- Fetches data every 30 seconds automatically
- Manual refresh available via button

#### 2. Updated Admin Orders Page (`admin-orders.html`)

Added navigation tabs to switch between Users and Orders views.

#### 3. Dynamic Base URL

Both admin pages now automatically detect the environment:
```javascript
const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://localhost:${window.location.port || 8000}`
    : 'https://openai-apps-sdk-examples-2-7lml.onrender.com';
```

This allows seamless operation in both:
- Local development (http://localhost:8000)
- Production deployment (render.com URL)

## API Endpoints

### GET /api/admin/users

**Description:** Fetch all users with their statistics

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "5dc8f178-98a4-4c22-809e-c7590a69eb2d",
      "username": "demo2",
      "email": "demo2@demo.com",
      "createdAt": "2026-01-02T01:18:33.927Z",
      "totalOrders": 8,
      "paidOrders": 0,
      "totalSpent": 0
    }
  ]
}
```

**Status Codes:**
- 200: Success
- 500: Server error

## Usage

### Accessing the Admin Panel

1. **Local Development:**
   ```
   http://localhost:8000/admin/users
   ```

2. **Production:**
   ```
   https://openai-apps-sdk-examples-2-7lml.onrender.com/admin/users
   ```

### Navigation

- Click on "Users" tab to view user management
- Click on "Orders" tab to view order management
- Use the "Refresh" button to manually update data

## Database Query

The feature uses an optimized SQL query that:
1. Retrieves all users from the `users` table
2. Left joins with `orders` table to get order statistics
3. Groups by user to aggregate order counts and revenue
4. Orders by creation date (newest first)

```sql
SELECT 
  u.id, 
  u.username, 
  u.email, 
  u.created_at,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END) as paid_orders,
  COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END), 0) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email, u.created_at
ORDER BY u.created_at DESC
```

## Security Considerations

⚠️ **Important:** This feature currently has no authentication/authorization. In production:

1. Add admin authentication middleware
2. Implement role-based access control (RBAC)
3. Add rate limiting to prevent abuse
4. Log all admin actions for audit trails
5. Consider adding CSRF protection

## Future Enhancements

1. **User Details Modal:** Click on a user to see detailed information
2. **User Actions:** Edit, disable, or delete users
3. **Advanced Filtering:** Search by username, email, or status
4. **Sorting:** Sort by different columns
5. **Pagination:** Handle large numbers of users efficiently
6. **Export:** Download user data as CSV/Excel
7. **User Activity Log:** View detailed user actions
8. **Email Verification Status:** Show if users have verified their emails
9. **Last Login:** Display when users last accessed the system
10. **User Segments:** Group users by activity level or spending

## Testing

The feature has been tested with:
- ✅ Multiple users in the database
- ✅ Users with varying order counts
- ✅ Users with no orders
- ✅ Different monetary values
- ✅ Local development environment
- ✅ API endpoint returning correct data

## Files Modified/Created

### Created:
- `admin-users.html` - New admin users interface
- `docs/ADMIN_USERS_FEATURE.md` - This documentation

### Modified:
- `pizzaz_server_node/src/services/auth.service.ts` - Added getAllUsers method
- `pizzaz_server_node/src/routes/auth.routes.ts` - Added getAllUsers route handler
- `pizzaz_server_node/src/routes/static.routes.ts` - Added serveAdminUsersPage method
- `pizzaz_server_node/src/server.ts` - Added new endpoints and updated startup message
- `admin-orders.html` - Added navigation tabs and dynamic base URL

## Conclusion

The Admin Users Management feature provides a comprehensive view of all registered users with their key statistics, enabling administrators to monitor user activity and engagement effectively. The feature integrates seamlessly with the existing admin dashboard and follows the established design patterns of the application.

