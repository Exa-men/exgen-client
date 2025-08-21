/**
 * Custom hook for API calls with proper authentication
 */
import { useAuth } from '@clerk/nextjs';
import { useCallback, useMemo, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface WelcomeVoucherStatusResponse {
  should_show_banner: boolean;
  has_received: boolean;
  user_id: string;
  message: string;
}

export interface WelcomeVoucherActivateResponse {
  success: boolean;
  credits_added: number;
  new_balance: number;
  user_id: string;
  message: string;
  error?: string;
}

export function useApi() {
  const { getToken } = useAuth();
  
  // Clerk token caching to reduce repeated calls
  const tokenCache = useRef<{ token: string | null; timestamp: number }>({ 
    token: null, 
    timestamp: 0 
  });
  
  const CACHE_DURATION = 4 * 60 * 1000; // 4 minutes (Clerk tokens expire in 5 minutes)

  const getCachedToken = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Return cached token if still valid and not forcing refresh
    if (!forceRefresh && tokenCache.current.token && 
        (now - tokenCache.current.timestamp) < CACHE_DURATION) {
      return tokenCache.current.token;
    }
    
    // Fetch new token and cache it
    try {
      const token = await getToken();
      if (token) {
        tokenCache.current = { token, timestamp: now };
        // console.log('🔐 New Clerk token cached at:', new Date().toISOString());
      }
      return token;
    } catch (error) {
      // console.warn('⚠️ Failed to fetch Clerk token:', error);
      // Clear expired token from cache
      tokenCache.current = { token: null, timestamp: 0 };
      return null;
    }
  }, [getToken]);

  const clearTokenCache = useCallback(() => {
    tokenCache.current = { token: null, timestamp: 0 };
    // console.log('🗑️ Token cache cleared');
  }, []);

  const makeAuthenticatedRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> => {
    try {
      const token = await getCachedToken(retryCount > 0);
      
      if (!token) {
        return {
          error: {
            detail: 'No authentication token available',
            status: 401,
          },
        };
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        
        // Handle 401 errors with automatic token refresh and retry
        if (response.status === 401 && retryCount === 0) {
          // console.log('🔄 Token expired, refreshing and retrying...');
          // Clear the expired token from cache
          tokenCache.current = { token: null, timestamp: 0 };
          // Retry once with a fresh token
          return makeAuthenticatedRequest(endpoint, options, retryCount + 1);
        }
        
        return {
          error: {
            detail: errorData.detail || `HTTP ${response.status}`,
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: {
          detail: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }, [getCachedToken]);

  const uploadFile = useCallback(async (versionId: string, file: File, retryCount = 0) => {
    try {
      const token = await getCachedToken(retryCount > 0);
      if (!token) {
        return { error: { detail: 'No authentication token available', status: 401 } };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name); // Add the required name parameter
      formData.append('is_preview', 'false'); // Add optional parameter
      formData.append('order', '0'); // Add optional parameter

      const response = await fetch(`${API_BASE_URL}/api/v1/catalog/versions/${versionId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        
        // Handle 401 errors with automatic token refresh and retry
        if (response.status === 401 && retryCount === 0) {
          // console.log('🔄 Token expired during file upload, refreshing and retrying...');
          // Clear the expired token from cache
          tokenCache.current = { token: null, timestamp: 0 };
          // Retry once with a fresh token
          return uploadFile(versionId, file, retryCount + 1);
        }
        
        return {
          error: {
            detail: errorData.detail || `Upload failed: ${response.status}`,
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: {
          detail: error instanceof Error ? error.message : 'Upload failed',
        },
      };
    }
  }, [getCachedToken]);

  const uploadWorkflowFile = useCallback(async (file: File, templateName: string, retryCount = 0) => {
    try {
      const token = await getCachedToken(retryCount > 0);
      if (!token) {
        return { error: { detail: 'No authentication token available', status: 401 } };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('template_name', templateName);

      const response = await fetch(`${API_BASE_URL}/api/v1/workflows/upload-template`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        
        // Handle 401 errors with automatic token refresh and retry
        if (response.status === 401 && retryCount === 0) {
          // console.log('🔄 Token expired during workflow file upload, refreshing and retrying...');
          // Clear the expired token from cache
          tokenCache.current = { token: null, timestamp: 0 };
          // Retry once with a fresh token
          return uploadWorkflowFile(file, templateName, retryCount + 1);
        }
        
        return {
          error: {
            detail: errorData.detail || `Upload failed: ${response.status}`,
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: {
          detail: error instanceof Error ? error.message : 'Upload failed',
        },
      };
    }
  }, [getCachedToken]);

  // Use useMemo to prevent the API object from being recreated on every render
  return useMemo(() => ({
    // Token management
    refreshToken: () => getCachedToken(true),
    clearTokenCache,
    getCachedToken,
    
    // Raw API call method for custom endpoints
    makeAuthenticatedRequest,
    
    // Product operations
    getProduct: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}/edit`),
    listProducts: (page = 1, size = 10, search = '', filter = 'alles') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: size.toString(),
        filter: filter,
      });
      if (search) params.append('search', search);
      return makeAuthenticatedRequest(`/api/v1/catalog/products?${params}`);
    },
    createProduct: (data: any) => makeAuthenticatedRequest('/api/v1/catalog/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateProduct: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteProduct: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`, {
      method: 'DELETE',
    }),
    updateProductStatus: (id: string, status: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

    // Version operations
    getProductVersions: (productId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions`),
    createProductVersion: (productId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateProductVersion: (productId: string, versionId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteProductVersion: (productId: string, versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}`, {
      method: 'DELETE',
    }),
    updateVersionStatus: (productId: string, versionId: string, isEnabled: boolean) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/status?enabled=${isEnabled}`, {
      method: 'PATCH',
    }),

    // Document operations
    getVersionDocuments: (productId: string, versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/documents`),
    createVersionDocument: (productId: string, versionId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateVersionDocument: (productId: string, versionId: string, documentId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteVersionDocument: (productId: string, versionId: string, documentId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/documents/${documentId}`, {
      method: 'DELETE',
    }),

    // Assessment operations
    getAssessmentComponents: (productId: string, versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/assessment-components`),
    createAssessmentComponent: (productId: string, versionId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/assessment-components`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateAssessmentComponent: (productId: string, versionId: string, componentId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${versionId}/assessment-components/${componentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteAssessmentComponent: (productId: string, versionId: string, componentId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions/${productId}/assessment-components/${componentId}`, {
      method: 'DELETE',
    }),
    saveProductAssessment: (productId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/save-assessment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    // Workflow operations
    getWorkflowGroups: () => makeAuthenticatedRequest('/api/v1/workflows/groups'),
    createWorkflowGroup: (data: any) => makeAuthenticatedRequest('/api/v1/workflows/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateWorkflowGroup: (groupId: string, data: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteWorkflowGroup: (groupId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}`, {
      method: 'DELETE',
    }),
    getWorkflowPrompts: (groupId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts`),
    createWorkflowPrompt: (groupId: string, data: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateWorkflowPrompt: (groupId: string, promptIdOrName: string, data: any) => {
      // Check if this is a prompt ID (UUID format) or a prompt name
      const isPromptId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptIdOrName);
      
      if (isPromptId) {
        // It's a prompt ID, use the standard endpoint
        return makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts/${promptIdOrName}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        // It's a prompt name - this is not supported by the current backend
        // console.warn('⚠️ updateWorkflowPrompt called with promptName - this is not supported by the current backend');
        return Promise.resolve({
          error: {
            detail: 'Updating prompts by name is not supported. Prompts must be managed as separate entities with IDs.',
            status: 400
          }
        });
      }
    },
    deleteWorkflowPrompt: (groupId: string, promptId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts/${promptId}`, {
      method: 'DELETE',
    }),
    runWorkflow: (groupId: string, data: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/run`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getWorkflowRuns: (groupId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/runs`),
    getWorkflowRun: (groupId: string, runId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/runs/${runId}`),
    updateWorkflowBaseInstructions: (groupId: string, content: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/config`, {
      method: 'PATCH',
      body: JSON.stringify({ base_instructions: content }),
    }),
    getAvailableModels: () => makeAuthenticatedRequest('/api/v1/workflows/models/available'),
    
    // Workflow group specific operations
    renameWorkflowGroup: (groupId: string, name: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
    activateWorkflowGroup: (groupId: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: true }),
    }),
    updateWorkflowConfig: (groupId: string, config: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    }),



    // Admin operations
    getAdminUsers: () => makeAuthenticatedRequest('/api/v1/admin/users'),
    updateUserRole: (userId: string, role: string) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
    updateUserCredits: (userId: string, credits: number) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}/credits`, {
      method: 'PUT',
      body: JSON.stringify({ credits }),
    }),
    updateUserSchool: (userId: string, school: string) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}/school`, {
      method: 'PUT',
      body: JSON.stringify({ school }),
    }),
    updateUserDepartment: (userId: string, department: string) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}/department`, {
      method: 'PUT',
      body: JSON.stringify({ department }),
    }),
    updateUserEmail: (userId: string, email: string) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}/email`, {
      method: 'PUT',
      body: JSON.stringify({ email }),
    }),
    getAdminCreditOrders: (page = 1, size = 20) => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      return makeAuthenticatedRequest(`/api/v1/admin/credits/orders?${params}`);
    },
    fulfillCreditOrder: (orderId: string, data: any) => makeAuthenticatedRequest(`/api/v1/admin/credits/orders/${orderId}/fulfill`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    updateOrderStatus: (orderId: string, status: string) => makeAuthenticatedRequest(`/api/v1/admin/credits/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    getAdminCreditPackages: () => makeAuthenticatedRequest('/api/v1/admin/credits/packages'),
    createAdminCreditPackage: (data: any) => makeAuthenticatedRequest('/api/v1/admin/credits/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateAdminCreditPackage: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/admin/credits/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteAdminCreditPackage: (id: string) => makeAuthenticatedRequest(`/api/v1/admin/credits/packages/${id}`, {
      method: 'DELETE',
    }),
    getAdminVouchers: (page = 1, size = 20) => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      return makeAuthenticatedRequest(`/api/v1/admin/vouchers?${params}`);
    },
    createAdminVoucher: (data: any) => makeAuthenticatedRequest('/api/v1/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateAdminVoucher: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/admin/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteAdminVoucher: (id: string) => makeAuthenticatedRequest(`/api/v1/admin/vouchers/${id}`, {
      method: 'DELETE',
    }),
    deleteUser: (userId: string) => makeAuthenticatedRequest(`/api/v1/admin/users/${userId}`, {
      method: 'DELETE',
    }),
    getWelcomeVoucherStats: () => makeAuthenticatedRequest('/api/v1/admin/welcome-voucher/stats'),

    // Credit operations
    getCreditBalance: () => makeAuthenticatedRequest('/api/v1/credits/balance'),
    getCreditPackages: () => makeAuthenticatedRequest('/api/v1/credits/packages'),
    createCreditOrder: (data: any) => makeAuthenticatedRequest('/api/v1/credits/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    redeemVoucher: (data: any) => makeAuthenticatedRequest('/api/v1/credits/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getWelcomeVoucherStatus: () => makeAuthenticatedRequest<WelcomeVoucherStatusResponse>('/api/v1/credits/welcome-voucher/status'),
    markFirstLogin: () => makeAuthenticatedRequest('/api/v1/credits/welcome-voucher/mark-first-login', {
      method: 'POST',
    }),
    activateWelcomeVoucher: () => makeAuthenticatedRequest<WelcomeVoucherActivateResponse>('/api/v1/credits/welcome-voucher/activate', {
      method: 'POST',
    }),

    // Catalog operations
    purchaseProduct: (data: any) => makeAuthenticatedRequest('/api/v1/catalog/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    submitFeedback: (data: any) => makeAuthenticatedRequest('/api/v1/catalog/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    verifyHash: (data: any) => makeAuthenticatedRequest('/api/v1/catalog/verify-hash', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    initiateDownload: (productId: string, versionId?: string) => {
      const url = versionId 
        ? `/api/v1/catalog/download/${productId}/initiate?version_id=${versionId}`
        : `/api/v1/catalog/download/${productId}/initiate`;
      return makeAuthenticatedRequest(url, { method: 'POST' });
    },
    getDownloadPackage: (productId: string, downloadId: string, versionId?: string) => {
      const url = versionId 
        ? `/api/v1/catalog/download/${productId}/package/${downloadId}?version_id=${versionId}`
        : `/api/v1/catalog/download/${productId}/package/${downloadId}`;
      return makeAuthenticatedRequest(url);
    },
    getDownloadVerification: (productId: string, downloadId: string, versionId?: string) => {
      const url = versionId 
        ? `/api/v1/catalog/download/${productId}/verification/${downloadId}?version_id=${versionId}`
        : `/api/v1/catalog/download/${productId}/verification/${downloadId}`;
      return makeAuthenticatedRequest(url);
    },

    // System operations
    getSystemHealth: () => makeAuthenticatedRequest('/api/v1/health'),
    getTestEndpoint: () => makeAuthenticatedRequest('/api/v1/test'),

    // Auth operations
    getUserRole: () => makeAuthenticatedRequest('/api/v1/auth/user/role'),
    
    // File upload operations
    uploadFile,
    uploadWorkflowFile,

    // Document management operations
    setPreviewDocument: (documentId: string, isPreview: boolean) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${documentId}/preview`, {
      method: 'PATCH',
      body: JSON.stringify({ is_preview: isPreview }),
    }),
    copyDocuments: (targetVersionId: string, sourceVersionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${targetVersionId}/documents/copy`, {
      method: 'POST',
      body: JSON.stringify({ source_version_id: sourceVersionId }),
    }),
    copyAssessmentData: (targetVersionId: string, sourceVersionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${targetVersionId}/assessment/copy`, {
      method: 'POST',
      body: JSON.stringify({ source_version_id: sourceVersionId }),
    }),
    verifyDatabase: (productId: string) => makeAuthenticatedRequest('/api/v1/catalog/verify-database', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    }),
    cleanupProductPreview: (productId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/cleanup-preview`, {
      method: 'POST',
    }),
    getProductPreviewStatus: (productId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/preview-status`),

    // S3 verification operations
    verifyAllDocumentsS3: (versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/verify-s3`, {
      method: 'POST',
    }),
    verifyDocumentS3: (documentId: string) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${documentId}/verify-s3`, {
      method: 'POST',
    }),

    // Workflow configuration operations
    getWorkflowStepsConfig: () => makeAuthenticatedRequest('/api/v1/workflows/steps-config'),
    getJobStatus: (jobId: string) => makeAuthenticatedRequest(`/api/v1/workflows/jobs/${jobId}/detailed-status`),
  }), [makeAuthenticatedRequest, uploadFile, uploadWorkflowFile, getCachedToken, clearTokenCache]);
} 