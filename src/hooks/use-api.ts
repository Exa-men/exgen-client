/**
 * Custom hook for API calls with proper authentication
 */
import { useAuth } from '@clerk/nextjs';
import { useCallback, useMemo } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export function useApi() {
  const { getToken } = useAuth();

  // Create a stable reference to the getToken function
  const stableGetToken = useCallback(async () => {
    return await getToken();
  }, [getToken]);

  const makeAuthenticatedRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      const token = await stableGetToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
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
  }, [stableGetToken]);

  const uploadFile = useCallback(async (versionId: string, file: File) => {
    try {
      const token = await stableGetToken();
      if (!token) {
        return { error: { detail: 'No authentication token' } };
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/v1/catalog/versions/${versionId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
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
  }, [stableGetToken]);

  const uploadWorkflowFile = useCallback(async (file: File, templateName: string) => {
    try {
      const token = await stableGetToken();
      if (!token) {
        return { error: { detail: 'No authentication token' } };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('template_name_or_id', templateName);

      const response = await fetch(`${API_BASE_URL}/api/v1/workflows/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          error: {
            detail: `Upload failed: ${errorData}`,
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
  }, [stableGetToken]);

  // Use useMemo to prevent the API object from being recreated on every render
  return useMemo(() => ({
    // Product operations
    getProduct: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}/edit`),
    updateProduct: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    saveProduct: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    deleteProduct: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`, {
      method: 'DELETE',
    }),
    createProduct: (data: any) => makeAuthenticatedRequest('/api/v1/catalog/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getProductById: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}`),
    updateProductStatus: (id: string, status: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    
    // Version operations
    createVersion: (productId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateVersion: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteVersion: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${id}`, {
      method: 'DELETE',
    }),
    toggleVersionStatus: (id: string, enabled: boolean) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled: enabled }),
    }),
    
    
    // Component operations
    createComponent: (versionId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateComponent: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteComponent: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/components/${id}`, {
      method: 'DELETE',
    }),
    
    // Criteria operations
    createCriteria: (componentId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/components/${componentId}/criteria`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateCriteria: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/criteria/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteCriteria: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/criteria/${id}`, {
      method: 'DELETE',
    }),
    updateLevel: (criteriaId: string, levelId: string, data: any) => makeAuthenticatedRequest(`/api/v1/catalog/criteria/${criteriaId}/levels/${levelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
    // File operations
    uploadDocument: uploadFile,
    deleteDocument: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${id}`, {
      method: 'DELETE',
    }),
    setPreviewDocument: (id: string, isPreview: boolean) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${id}/preview`, {
      method: 'PATCH',
      body: JSON.stringify({ is_preview: isPreview }),
    }),
    getDocumentDownloadUrl: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${id}/download`),
    copyDocuments: (versionId: string, sourceVersionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/copy-documents?source_version_id=${sourceVersionId}`, {
      method: 'POST',
    }),
    
    // List operations
    listProducts: (page = 1, limit = 10, search?: string, filter = 'alles') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter,
      });
      if (search) params.append('search', search);
      return makeAuthenticatedRequest(`/api/v1/catalog/products?${params}`);
    },
    listDocuments: (versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/documents`),
    
    // S3 Verification operations
    verifyDocumentS3: (id: string) => makeAuthenticatedRequest(`/api/v1/catalog/documents/${id}/verify-s3`),
    verifyAllDocumentsS3: (versionId: string) => makeAuthenticatedRequest(`/api/v1/catalog/versions/${versionId}/documents/verify-all`),
    
    // Database verification operations
    verifyDatabase: (productId: string) => makeAuthenticatedRequest(`/api/v1/catalog/products/${productId}/verify-database`),

    // Workflow operations
    getWorkflowGroups: () => makeAuthenticatedRequest('/api/v1/workflows/groups'),
    getWorkflowGroup: (id: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}`),
    updateWorkflowGroup: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteWorkflowGroup: (id: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}`, {
      method: 'DELETE',
    }),
    activateWorkflowGroup: (id: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}/activate`, {
      method: 'POST',
    }),
    getWorkflowConfig: (id: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}/config`),
    updateWorkflowConfig: (id: string, data: any) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getAvailableModels: () => makeAuthenticatedRequest('/api/v1/workflows/models/available'),
    getWorkflowRuns: (page = 1, size = 20) => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      return makeAuthenticatedRequest(`/api/v1/workflows/runs?${params}`);
    },
    generateWorkflow: (data: any) => makeAuthenticatedRequest('/api/v1/workflows/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getJobStatus: (jobId: string) => makeAuthenticatedRequest(`/api/v1/workflows/jobs/${jobId}`),
    
    // NEW: Additional Workflow operations
    getWorkflowStepsConfig: () => makeAuthenticatedRequest('/api/v1/workflows/config'),
    uploadWorkflowFile: uploadWorkflowFile,
    getWorkflowPrompt: (groupId: string, promptName: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts/${promptName}`),
    updateWorkflowPrompt: (groupId: string, promptName: string, content: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/prompts/${promptName}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
    createWorkflowGroup: (data: any) => makeAuthenticatedRequest('/api/v1/workflows/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    renameWorkflowGroup: (id: string, name: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
    updateWorkflowBaseInstructions: (groupId: string, content: string) => makeAuthenticatedRequest(`/api/v1/workflows/groups/${groupId}/config`, {
      method: 'PATCH',
      body: JSON.stringify({ base_instructions: content }),
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
    getWelcomeVoucherStatus: () => makeAuthenticatedRequest('/api/v1/credits/welcome-voucher/status'),
    markFirstLogin: () => makeAuthenticatedRequest('/api/v1/credits/welcome-voucher/mark-first-login', {
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

    // System operations
    getSystemHealth: () => makeAuthenticatedRequest('/api/v1/health'),
    getTestEndpoint: () => makeAuthenticatedRequest('/api/v1/test'),

    // Auth operations
    getUserRole: () => makeAuthenticatedRequest('/api/v1/auth/user/role'),
  }), [makeAuthenticatedRequest, uploadFile, uploadWorkflowFile]);
} 