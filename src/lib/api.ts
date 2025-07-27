/**
 * API Service Layer for ExGen Backend
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Base API client with authentication
class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      // In browser environment, get token from Clerk
      try {
        const { useAuth } = await import('@clerk/nextjs');
        // Note: This is a simplified approach - in practice, you'd use a hook or context
        return null; // Will be handled by the component using the API
      } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
      }
    }
    return null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      
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
  }

  // Product Management
  async getProduct(productId: string) {
    return this.makeRequest(`/api/catalog/products/${productId}/edit`);
  }

  async updateProduct(productId: string, data: any) {
    return this.makeRequest(`/api/catalog/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async saveProduct(productId: string, data: any) {
    return this.makeRequest(`/api/catalog/products/${productId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: string) {
    return this.makeRequest(`/api/catalog/products/${productId}`, {
      method: 'DELETE',
    });
  }

  // Version Management
  async createVersion(productId: string, data: any) {
    return this.makeRequest(`/api/catalog/products/${productId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVersion(versionId: string, data: any) {
    return this.makeRequest(`/api/catalog/versions/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVersion(versionId: string) {
    return this.makeRequest(`/api/catalog/versions/${versionId}`, {
      method: 'DELETE',
    });
  }

  async toggleVersionStatus(versionId: string, isEnabled: boolean) {
    return this.makeRequest(`/api/catalog/versions/${versionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled: isEnabled }),
    });
  }



  // Assessment Components
  async createComponent(versionId: string, data: any) {
    return this.makeRequest(`/api/catalog/versions/${versionId}/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateComponent(componentId: string, data: any) {
    return this.makeRequest(`/api/catalog/components/${componentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteComponent(componentId: string) {
    return this.makeRequest(`/api/catalog/components/${componentId}`, {
      method: 'DELETE',
    });
  }

  // Assessment Criteria
  async createCriteria(componentId: string, data: any) {
    return this.makeRequest(`/api/catalog/components/${componentId}/criteria`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCriteria(criteriaId: string, data: any) {
    return this.makeRequest(`/api/catalog/criteria/${criteriaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCriteria(criteriaId: string) {
    return this.makeRequest(`/api/catalog/criteria/${criteriaId}`, {
      method: 'DELETE',
    });
  }

  async updateLevel(criteriaId: string, levelId: string, data: any) {
    return this.makeRequest(`/api/catalog/criteria/${criteriaId}/levels/${levelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // File Management
  async uploadDocument(versionId: string, file: File) {
    const token = await this.getAuthToken();
    if (!token) {
      return { error: { detail: 'No authentication token' } };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
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
  }

  async deleteDocument(documentId: string) {
    return this.makeRequest(`/api/catalog/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async setPreviewDocument(documentId: string, isPreview: boolean) {
    return this.makeRequest(`/api/catalog/documents/${documentId}/preview`, {
      method: 'PATCH',
      body: JSON.stringify({ is_preview: isPreview }),
    });
  }

  async getDocumentDownloadUrl(documentId: string) {
    return this.makeRequest(`/api/catalog/documents/${documentId}/download`);
  }

  // List endpoints
  async listProducts(page = 1, limit = 10, search?: string, filter = 'alles') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      filter,
    });
    if (search) params.append('search', search);
    
    return this.makeRequest(`/api/catalog/products?${params}`);
  }

  async listDocuments(versionId: string) {
    return this.makeRequest(`/api/catalog/versions/${versionId}/documents`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience functions for common operations
export const api = {
  // Product operations
  getProduct: (id: string) => apiClient.getProduct(id),
  updateProduct: (id: string, data: any) => apiClient.updateProduct(id, data),
  saveProduct: (id: string, data: any) => apiClient.saveProduct(id, data),
  deleteProduct: (id: string) => apiClient.deleteProduct(id),
  
  // Version operations
  createVersion: (productId: string, data: any) => apiClient.createVersion(productId, data),
  updateVersion: (id: string, data: any) => apiClient.updateVersion(id, data),
  deleteVersion: (id: string) => apiClient.deleteVersion(id),
  toggleVersionStatus: (id: string, enabled: boolean) => apiClient.toggleVersionStatus(id, enabled),
  
  
  // Component operations
  createComponent: (versionId: string, data: any) => apiClient.createComponent(versionId, data),
  updateComponent: (id: string, data: any) => apiClient.updateComponent(id, data),
  deleteComponent: (id: string) => apiClient.deleteComponent(id),
  
  // Criteria operations
  createCriteria: (componentId: string, data: any) => apiClient.createCriteria(componentId, data),
  updateCriteria: (id: string, data: any) => apiClient.updateCriteria(id, data),
  deleteCriteria: (id: string) => apiClient.deleteCriteria(id),
  updateLevel: (criteriaId: string, levelId: string, data: any) => apiClient.updateLevel(criteriaId, levelId, data),
  
  // File operations
  uploadDocument: (versionId: string, file: File) => apiClient.uploadDocument(versionId, file),
  deleteDocument: (id: string) => apiClient.deleteDocument(id),
  setPreviewDocument: (id: string, isPreview: boolean) => apiClient.setPreviewDocument(id, isPreview),
  getDocumentDownloadUrl: (id: string) => apiClient.getDocumentDownloadUrl(id),
  
  // List operations
  listProducts: (page?: number, limit?: number, search?: string, filter?: string) => 
    apiClient.listProducts(page, limit, search, filter),
  listDocuments: (versionId: string) => apiClient.listDocuments(versionId),
}; 