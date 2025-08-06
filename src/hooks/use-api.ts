/**
 * Custom hook for API calls with proper authentication
 */
import { useAuth } from '@clerk/nextjs';
import { useCallback } from 'react';

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

  const makeAuthenticatedRequest = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      const token = await getToken();
      
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
  }, [getToken]);

  const uploadFile = useCallback(async (versionId: string, file: File) => {
    try {
      const token = await getToken();
      if (!token) {
        return { error: { detail: 'No authentication token' } };
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/catalog/versions/${versionId}/documents`, {
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
  }, [getToken]);

  return {
    // Product operations
    getProduct: (id: string) => makeAuthenticatedRequest(`/api/catalog/products/${id}/edit`),
    updateProduct: (id: string, data: any) => makeAuthenticatedRequest(`/api/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    saveProduct: (id: string, data: any) => makeAuthenticatedRequest(`/api/catalog/products/${id}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    deleteProduct: (id: string) => makeAuthenticatedRequest(`/api/catalog/products/${id}`, {
      method: 'DELETE',
    }),
    
    // Version operations
    createVersion: (productId: string, data: any) => makeAuthenticatedRequest(`/api/catalog/products/${productId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateVersion: (id: string, data: any) => makeAuthenticatedRequest(`/api/catalog/versions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteVersion: (id: string) => makeAuthenticatedRequest(`/api/catalog/versions/${id}`, {
      method: 'DELETE',
    }),
    toggleVersionStatus: (id: string, enabled: boolean) => makeAuthenticatedRequest(`/api/catalog/versions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled: enabled }),
    }),
    
    
    // Component operations
    createComponent: (versionId: string, data: any) => makeAuthenticatedRequest(`/api/catalog/versions/${versionId}/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateComponent: (id: string, data: any) => makeAuthenticatedRequest(`/api/catalog/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteComponent: (id: string) => makeAuthenticatedRequest(`/api/catalog/components/${id}`, {
      method: 'DELETE',
    }),
    
    // Criteria operations
    createCriteria: (componentId: string, data: any) => makeAuthenticatedRequest(`/api/catalog/components/${componentId}/criteria`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateCriteria: (id: string, data: any) => makeAuthenticatedRequest(`/api/catalog/criteria/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteCriteria: (id: string) => makeAuthenticatedRequest(`/api/catalog/criteria/${id}`, {
      method: 'DELETE',
    }),
    updateLevel: (criteriaId: string, levelId: string, data: any) => makeAuthenticatedRequest(`/api/catalog/criteria/${criteriaId}/levels/${levelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
    // File operations
    uploadDocument: uploadFile,
    deleteDocument: (id: string) => makeAuthenticatedRequest(`/api/catalog/documents/${id}`, {
      method: 'DELETE',
    }),
    setPreviewDocument: (id: string, isPreview: boolean) => makeAuthenticatedRequest(`/api/catalog/documents/${id}/preview`, {
      method: 'PATCH',
      body: JSON.stringify({ is_preview: isPreview }),
    }),
    getDocumentDownloadUrl: (id: string) => makeAuthenticatedRequest(`/api/catalog/documents/${id}/download`),
    
    // List operations
    listProducts: (page = 1, limit = 10, search?: string, filter = 'alles') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter,
      });
      if (search) params.append('search', search);
      return makeAuthenticatedRequest(`/api/catalog/products?${params}`);
    },
    listDocuments: (versionId: string) => makeAuthenticatedRequest(`/api/catalog/versions/${versionId}/documents`),
    
    // S3 Verification operations
    verifyDocumentS3: (id: string) => makeAuthenticatedRequest(`/api/catalog/documents/${id}/verify-s3`),
    verifyAllDocumentsS3: (versionId: string) => makeAuthenticatedRequest(`/api/catalog/versions/${versionId}/documents/verify-all`),
    
    // Database verification operations
    verifyDatabase: (productId: string) => makeAuthenticatedRequest(`/api/catalog/products/${productId}/verify-database`),
  };
} 