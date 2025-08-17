# Frontend API Endpoints Briefing
## ExGen Backend API v1

**Base URL**: `/api/v1`  
**Authentication**: Clerk-based JWT tokens (Bearer authentication)  
**Documentation**: Available at `/api/v1/docs` (Swagger UI)

---

## 🔐 Authentication Endpoints (`/auth`)

### User Management
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/auth/me` | Get current user information | ✅ | Any |
| `PUT` | `/auth/me` | Update current user information | ✅ | Any |
| `GET` | `/auth/user/role` | Get current user's role | ✅ | Any |
| `GET` | `/auth/profile` | Get detailed user profile | ✅ | Any |
| `GET` | `/auth/auth-status` | Get authentication status | ✅ | Any |

### Session Management
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/auth/logout` | Logout user (Clerk handles actual logout) | ✅ | Any |

---

## 💰 Credit System Endpoints (`/credits`)

### Credit Packages
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/credits/packages` | Get list of credit packages | ❌ | None |
| `GET` | `/credits/packages/{id}` | Get credit package by ID | ❌ | None |
| `POST` | `/credits/packages` | Create new credit package | ✅ | Admin |
| `PUT` | `/credits/packages/{id}` | Update credit package | ✅ | Admin |
| `DELETE` | `/credits/packages/{id}` | Delete credit package | ✅ | Admin |

### Credit Orders
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/credits/orders` | Get paginated credit orders | ✅ | Any (own orders only) |
| `GET` | `/credits/orders/{id}` | Get credit order by ID | ✅ | Any (own orders only) |
| `POST` | `/credits/orders` | Create new credit order | ✅ | Any |
| `PUT` | `/credits/orders/{id}` | Update credit order | ✅ | Any (own orders only) |

### Vouchers
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/credits/vouchers` | Get paginated vouchers | ✅ | Any (own vouchers only) |
| `GET` | `/credits/vouchers/{id}` | Get voucher by ID | ✅ | Any (own vouchers only) |
| `POST` | `/credits/vouchers` | Create new voucher | ✅ | Any |
| `POST` | `/credits/vouchers/redeem` | Redeem voucher for credits | ✅ | Any |
| `GET` | `/credits/vouchers/stats` | Get voucher statistics | ✅ | Admin |

### Welcome Vouchers
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/credits/welcome-voucher` | Create welcome voucher | ✅ | Any |
| `GET` | `/credits/welcome-voucher/stats` | Get welcome voucher stats | ✅ | Admin |
| `GET` | `/credits/welcome-voucher/status` | Get welcome voucher status | ✅ | Any |
| `POST` | `/credits/welcome-voucher/mark-first-login` | Mark first login | ✅ | Any |

### User Balance
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/credits/balance` | Get user credit balance | ✅ | Any |

---

## 📚 Product Catalog Endpoints (`/catalog`)

### Products
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/catalog/products` | Get paginated products with filters | ❌ | None |
| `GET` | `/catalog/products/{id}` | Get product by ID | ❌ | None |
| `POST` | `/catalog/products` | Create new product | ✅ | Admin |
| `PUT` | `/catalog/products/{id}` | Update product | ✅ | Admin |
| `DELETE` | `/catalog/products/{id}` | Delete product | ✅ | Admin |
| `PATCH` | `/catalog/products/{id}/status` | Update product status | ✅ | Admin |

### Product Versions
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/catalog/products/{id}/versions` | Get product versions | ❌ | None |
| `POST` | `/catalog/products/{id}/versions` | Create product version | ✅ | Admin |
| `PUT` | `/catalog/versions/{id}` | Update product version | ✅ | Admin |
| `PATCH` | `/catalog/versions/{id}/status` | Toggle version status | ✅ | Admin |

### Assessment Structure
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/catalog/versions/{id}/components` | Create assessment component | ✅ | Admin |
| `PUT` | `/catalog/components/{id}` | Update assessment component | ✅ | Admin |
| `DELETE` | `/catalog/components/{id}` | Delete assessment component | ✅ | Admin |
| `POST` | `/catalog/components/{id}/criteria` | Create assessment criteria | ✅ | Admin |
| `PUT` | `/catalog/criteria/{id}` | Update assessment criteria | ✅ | Admin |
| `DELETE` | `/catalog/criteria/{id}` | Delete assessment criteria | ✅ | Admin |
| `POST` | `/catalog/criteria/{id}/levels` | Create assessment level | ✅ | Admin |
| `PUT` | `/catalog/criteria/{id}/levels/{level_id}` | Update assessment level | ✅ | Admin |

### Document Management
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/catalog/versions/{id}/documents` | Upload version document | ✅ | Admin |
| `DELETE` | `/catalog/documents/{id}` | Delete version document | ✅ | Admin |
| `PATCH` | `/catalog/documents/{id}/preview` | Set preview document | ✅ | Admin |
| `POST` | `/catalog/versions/{id}/copy-documents` | Copy documents from source version | ✅ | Admin |
| `GET` | `/catalog/documents/{id}/download` | Get document download URL | ✅ | Any |

### Frontend-Specific Endpoints
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/catalog/products/{id}/edit` | Get product for editing | ✅ | Admin |
| `POST` | `/catalog/products/{id}/save` | Save product changes | ✅ | Admin |
| `GET` | `/catalog/preview/{id}` | Get product preview | ✅ | Any |
| `POST` | `/catalog/purchase` | Purchase product (placeholder) | ✅ | Any |
| `POST` | `/catalog/feedback` | Submit feedback (placeholder) | ✅ | Any |

---

## 🔄 Workflow Management Endpoints (`/workflows`)

### Workflow Groups
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/workflows/groups` | Get workflow groups | ❌ | None |
| `GET` | `/workflows/groups/{id}` | Get workflow group by ID | ❌ | None |
| `POST` | `/workflows/groups` | Create workflow group | ✅ | Admin |
| `PUT` | `/workflows/groups/{id}` | Update workflow group | ✅ | Admin |

### Workflow Execution
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/workflows/execute` | Execute workflow | ✅ | Any |
| `GET` | `/workflows/runs` | Get workflow runs | ✅ | Any |
| `GET` | `/workflows/runs/{id}` | Get workflow run by ID | ✅ | Any |

---

## ⚙️ Administrative Endpoints (`/admin`)

### System Health & Monitoring
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/admin/health` | Get system health status | ✅ | Admin |
| `GET` | `/admin/stats` | Get system statistics | ✅ | Admin |
| `GET` | `/admin/users/stats` | Get user statistics | ✅ | Admin |
| `GET` | `/admin/products/stats` | Get product statistics | ✅ | Admin |
| `GET` | `/admin/credits/stats` | Get credit statistics | ✅ | Admin |
| `GET` | `/admin/vouchers/stats` | Get voucher statistics | ✅ | Admin |
| `GET` | `/admin/workflows/stats` | Get workflow statistics | ✅ | Admin |

### System Configuration
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/admin/config` | Get system configuration | ✅ | Admin |
| `PUT` | `/admin/config` | Update system configuration | ✅ | Admin |

### Maintenance Tasks
| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/admin/maintenance/cleanup` | Run cleanup tasks | ✅ | Admin |
| `POST` | `/admin/maintenance/backup` | Create system backup | ✅ | Admin |

---

## 🌐 Root & Health Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `GET` | `/` | Root endpoint with API info | ❌ | None |
| `GET` | `/health` | Health check endpoint | ❌ | None |

---

## 📋 Common Response Models

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

### Success Response
```typescript
interface SuccessResponse {
  message: string;
  data?: any;
}
```

### Error Response
```typescript
interface ErrorResponse {
  detail: string;
  status_code: number;
}
```

---

## 🔒 Authentication & Authorization

### Clerk Integration
- **Provider**: Clerk handles all authentication
- **Token Type**: JWT session tokens
- **Header**: `Authorization: Bearer <token>`
- **User Data**: Retrieved from Clerk session, not stored locally

### Role-Based Access Control
- **Admin**: Full access to all endpoints
- **User**: Limited access (own resources only)
- **Guest**: Read-only access to public endpoints

### Protected Endpoints
- Most endpoints require authentication
- Admin-only endpoints check `current_user.role === "admin"`
- User-specific endpoints filter by `current_user.id`

---

## 📱 Frontend Integration Notes

### API Client Setup
```typescript
// Base configuration
const API_BASE = '/api/v1';

// Authentication header
const headers = {
  'Authorization': `Bearer ${clerkToken}`,
  'Content-Type': 'application/json'
};
```

### Error Handling
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **422**: Validation error
- **500**: Internal server error

### Pagination
- Use `PaginationParams` for list endpoints
- Default page size: 20
- Response includes total count and page info

### File Uploads
- Use `multipart/form-data` for document uploads
- File size limits apply
- Supported formats: PDF, DOC, images

---

## 🚀 Development & Testing

### Local Development
- **Backend URL**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/api/v1/docs`
- **Health Check**: `http://localhost:8000/health`

### Testing Endpoints
- Use Swagger UI at `/api/v1/docs`
- Test with Clerk test tokens
- Verify role-based access control

### Monitoring
- System health endpoint for status checks
- Admin stats for performance monitoring
- Error logging for debugging

---

*This briefing covers all available API endpoints as of the current backend implementation. For detailed schema definitions and request/response examples, refer to the Swagger documentation at `/api/v1/docs`.*
