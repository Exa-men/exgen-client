"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, Eye, Download, ShoppingCart, Loader2, MessageSquare, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

import PDFViewer from '../components/PDFViewer';
import TruncatedText from '../components/TruncatedText';
import VersionDropdown from '../components/VersionDropdown';
import FeedbackModal from '../components/FeedbackModal';
import DownloadModal from '../components/DownloadModal';
import CreditBanner from '../components/CreditBanner';
import WelcomeBanner from '../components/WelcomeBanner';

import { useCredits } from '../contexts/CreditContext';
import { useCreditModal } from '../contexts/CreditModalContext';
import { cn, downloadInkoopvoorwaarden } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useRoleContext } from '../contexts/RoleContext';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';

interface Version {
  id?: string; // Add optional id field for version identification
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  isLatest: boolean;
  isEnabled?: boolean; // Only present for admin users
  is_enabled?: boolean; // Database field name (snake_case) - fallback for isEnabled
}

interface ExamProduct {
  id: string;
  code: string;
  title: string;
  description: string;
  cost: number;
  credits: number;
  cohort: string;

  version: string;
  versions: Version[];
  isPurchased: boolean;
  downloadUrl?: string;
  status?: 'draft' | 'available'; // New status field
  hasPreviewDocument?: boolean; // Whether the product has a preview document
}



export default function CatalogusPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { userRole, isAdmin, hasRole } = useRoleContext();
  const { refreshCredits } = useCredits();
  const { openModal } = useCreditModal();
  
  const [products, setProducts] = useState<ExamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const mobileObserverRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 10;
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
  // State for purchase confirmation modal
  const [purchaseConfirmId, setPurchaseConfirmId] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  // State for download loading
  const [downloadingProduct, setDownloadingProduct] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExamProduct | null>(null);
  const [filter, setFilter] = useState<'alles' | 'ingekocht'>('alles');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackProduct, setFeedbackProduct] = useState<ExamProduct | null>(null);
  // State for download modal
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadProduct, setDownloadProduct] = useState<ExamProduct | null>(null);
  const [downloadVersionId, setDownloadVersionId] = useState<string | undefined>(undefined);
  const [downloadVersionString, setDownloadVersionString] = useState<string | undefined>(undefined);
  
  // State to track selected versions for each product to prevent duplicate downloads
  const [selectedVersions, setSelectedVersions] = useState<Record<string, { versionId: string; versionString: string }>>({});
  // State for delete modal
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // State for purchase terms checkbox
  const [purchaseTermsChecked, setPurchaseTermsChecked] = useState(false);
  // State for insufficient credits error in purchase modal
  const [purchaseModalError, setPurchaseModalError] = useState<string | null>(null);
  
  // State for status updates
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // State for welcome banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [welcomeBannerLoading, setWelcomeBannerLoading] = useState(true);
  
  // Filter products based on user role: admins see all products, regular users only see available products
  const filteredProducts = useMemo(() => {
    let result;
    if (isAdmin) {
      // Admins can see all products (draft and available)
      result = products;
    } else {
      // Regular users can only see available products
      const availableProducts = products.filter(product => product.status === 'available');
      result = availableProducts;
      // Filter out draft products for non-admin users
      result = result.filter(product => product.status !== 'draft');
    }
    
    return result;
  }, [products, isAdmin]);

  // Add search loading state
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Add search debounce ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request deduplication - prevent multiple simultaneous API calls
  const activeRequestRef = useRef<Promise<any> | null>(null);
  const requestKeyRef = useRef<string>('');

  // Generate a unique key for each request to prevent duplicates
  const getRequestKey = useCallback((pageNum: number, searchTerm: string, filter: string) => {
    return `${pageNum}-${searchTerm}-${filter}`;
  }, []);

  // Optimized loading state that considers both role and products loading
  const isPageLoading = useMemo(() => {
    // Show loading if we don't have a role yet, or if we're loading products
    return !hasRole || loading;
  }, [hasRole, loading]);

  // Optimized products loading state
  const isProductsLoading = useMemo(() => {
    // Only show products loading if we have a role but products are still loading
    return hasRole && loading;
  }, [hasRole, loading]);

  // Validation functions for product publication
  const isProductReadyForPublication = (product: ExamProduct): boolean => {
    // Check if basic product information is complete
    const hasBasicInfo = Boolean(product.code && product.title && product.description && product.credits && product.cohort);
    
    // Check if there's at least one version
    const hasVersion = product.versions && product.versions.length > 0;
    
    // Check if there's at least one enabled version (only for admin users)
    // Handle both possible field names: isEnabled (camelCase) and is_enabled (snake_case)
    const hasEnabledVersion = isAdmin ? 
      (product.versions && product.versions.some(version => {
        const isEnabled = version.isEnabled !== undefined ? version.isEnabled : version.is_enabled;
        return isEnabled === true;
      })) : 
      true; // For non-admin users, assume versions are enabled if they exist
    
    return hasBasicInfo && hasVersion && hasEnabledVersion;
  };


  // State for new product input row
  const [newProduct, setNewProduct] = useState({
    code: '',
    title: '',
    description: '',
    credits: '',
    cohort: '2025-26',
    status: 'draft' as 'draft' | 'available',
  });
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  // Handler for input changes
  const handleNewProductChange = (field: string, value: string) => {
    setNewProduct((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  // Handler for clearing input fields
  const handleClearNewProduct = () => {
    setNewProduct({
      code: '',
      title: '',
      description: '',
      credits: '',
      cohort: '2025-26',
      status: 'draft',
    });
  };

  // Handler for saving new product
  const handleSaveNewProduct = async () => {
    setSavingNewProduct(true);
    setError(null);
    try {
      const productData = {
        code: newProduct.code,
        title: newProduct.title,
        description: newProduct.description,
        cost: Number(newProduct.credits),
        credits: Number(newProduct.credits),
        cohort: newProduct.cohort,
        status: newProduct.status,
      };
      
      const { data: created, error } = await api.createProduct(productData);
      
      if (error) {
        
        // Handle authentication errors specifically
        if (error.status === 401) {
          if (error.detail.includes('Signature has expired') || error.detail.includes('Invalid Clerk token')) {
            try {
              // Try to refresh the token
              await api.refreshToken();
              toast.info('Sessie verlengd, probeer opnieuw.');
              setError('Je sessie is verlengd. Probeer het product opnieuw op te slaan.');
              return; // Don't throw error, let user retry
            } catch (refreshError) {
              // console.error('❌ Failed to refresh token:', refreshError);
              toast.error('Je sessie is verlopen. Log opnieuw in.');
              setError('Je sessie is verlopen. Log opnieuw in om door te gaan.');
              return;
            }
          } else {
            toast.error('Je bent niet geautoriseerd voor deze actie.');
            setError('Je bent niet geautoriseerd voor deze actie.');
            return;
          }
        }
        
        if (error.status === 409 && error.detail === "Product code already exists") {
          throw new Error(`Product code "${newProduct.code}" bestaat al. Gebruik een unieke code.`);
        }
        throw new Error(error.detail || 'Failed to add product');
      }
      
      setProducts((prev) => {
        const exists = prev.some(product => product.id === (created as any).id);
        if (exists) {
          return prev; // Don't add if already exists
        }
        return [(created as any), ...prev];
      });
      
      handleClearNewProduct();
    } catch (err) {
      // console.error('💥 Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setSavingNewProduct(false);
    }
  };

  const api = useApi();

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Proactive token refresh to prevent expiration during long admin sessions
  useEffect(() => {
    if (!isSignedIn) return;
    
    // Refresh token every 3 minutes (before the 4-minute cache expires)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        await api.refreshToken();
      } catch (error) {
        // console.warn('⚠️ Failed to refresh token proactively:', error);
      }
    }, 3 * 60 * 1000); // 3 minutes
    
    return () => clearInterval(tokenRefreshInterval);
  }, [isSignedIn, api]);

  // Separate function to fetch products with a specific search term
  const fetchProductsWithSearch = useCallback(async (pageNum = 1, append = false, searchValue?: string) => {
    if (!isSignedIn) return;
    
    // Use the passed searchValue or fall back to current state
    const currentSearchTerm = searchValue !== undefined ? searchValue : searchTerm;
    
    // Generate request key for deduplication
    const requestKey = getRequestKey(pageNum, currentSearchTerm, filter);
    
    // Check if this exact request is already in progress
    if (activeRequestRef.current && requestKeyRef.current === requestKey) {
      try {
        const result = await activeRequestRef.current;
        return result;
      } catch (error) {
      }
    }
    
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);
      
      // Store the request promise and key for deduplication
      requestKeyRef.current = requestKey;
      activeRequestRef.current = api.listProducts(pageNum, PAGE_SIZE, currentSearchTerm, filter);
      
      const { data, error: fetchError } = await activeRequestRef.current;
      
      if (fetchError) {
        
        // Handle authentication errors specifically
        if (fetchError.status === 401) {
          if (fetchError.detail.includes('Signature has expired') || fetchError.detail.includes('Invalid Clerk token')) {
            try {
              // Try to refresh the token
              await api.refreshToken();
              toast.info('Sessie verlengd, producten worden opnieuw geladen.');
              // Retry the fetch with the new token
              const retryResult = await api.listProducts(pageNum, PAGE_SIZE, currentSearchTerm, filter);
              if (retryResult.error) {
                throw new Error(`Failed to fetch products after token refresh: ${retryResult.error.detail}`);
              }
              // Process the retry result
              const retryData = retryResult.data;
              setProducts(prev => {
                if (append) {
                  const existingIds = new Set(prev.map((p: ExamProduct) => p.id));
                  const newProducts = ((retryData as any).products || []).filter((p: any) => !existingIds.has(p.id));
                  return [...prev, ...newProducts];
                } else {
                  return ((retryData as any).products || []);
                }
              });
              setHasMore((retryData as any)?.hasMore);
              setPage((retryData as any).page);
              return; // Successfully handled, exit early
            } catch (refreshError) {
              // console.error('❌ Failed to refresh token during product fetch:', refreshError);
              toast.error('Je sessie is verlopen. Log opnieuw in.');
              setError('Je sessie is verlopen. Log opnieuw in om door te gaan.');
              setProducts([]);
              setHasMore(false);
              setPage(1);
              return;
            }
          } else {
            toast.error('Je bent niet geautoriseerd om producten te bekijken.');
            setError('Je bent niet geautoriseerd om producten te bekijken.');
            setProducts([]);
            setHasMore(false);
            setPage(1);
            return;
          }
        }
        
        throw new Error(`Failed to fetch products: ${fetchError.detail}`);
      }
      
      setProducts(prev => {
        let result;
        if (append) {
          // When appending, filter out any duplicates
          const existingIds = new Set(prev.map((p: ExamProduct) => p.id));
          const newProducts = ((data as any).products || []).filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        } else {
          // When replacing, use the new data directly
          return ((data as any).products || []);
        }
      });
      
      const newHasMore = (data as any)?.hasMore;
      
      setHasMore(newHasMore);
      setPage((data as any).page);
      
    } catch (err) {
      // console.error('💥 === PRODUCTS FETCH ERROR ===');
      // console.error('Error fetching products:', err);
      setError('Failed to load exam products');
      setProducts([]);
      setHasMore(false);
      setPage(1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearchLoading(false);
      
      // Clear the active request reference
      activeRequestRef.current = null;
      requestKeyRef.current = '';
    }
  }, [isSignedIn, api, filter, PAGE_SIZE, searchTerm, page, getRequestKey]);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set search loading state immediately
    setSearchLoading(true);
    
    // Debounce the search API call
    searchTimeoutRef.current = setTimeout(() => {
      setSearchLoading(false);
      
      // Only search if we have a value or if clearing search
      if (value.trim() || value === '') {
        // Reset to page 1 when searching
        setPage(1);
        // Call API directly with the search value instead of using state
        fetchProductsWithSearch(1, false, value);
      }
    }, 500); // 500ms delay
  }, [fetchProductsWithSearch]);

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    // Use the existing function for normal fetches
    return fetchProductsWithSearch(pageNum, append);
  }, [fetchProductsWithSearch]);

  // Log products state changes (commented out to reduce console noise)
  // useEffect(() => {
  //   console.log('📊 === PRODUCTS STATE CHANGED ===');
  //   console.log('📊 New products state:', {
  //     count: products.length,
  //     ids: products.map(p => p.id),
  //     loading,
  //     loadingMore
  //   });
  // }, [products, loading, loadingMore]);

  // Track if initial fetch has been made to prevent duplicate calls
  const initialFetchMadeRef = useRef(false);

  // Initial fetch and on search/filter change
  useEffect(() => {
    // Only fetch products if we have a role (to avoid unnecessary API calls)
    if (hasRole && !initialFetchMadeRef.current) {
      initialFetchMadeRef.current = true;
      fetchProductsWithSearch(1, false);
    }
  }, [hasRole]); // Remove fetchProducts from dependencies to prevent re-runs

  // Fetch products when filter changes
  useEffect(() => {
    if (hasRole && initialFetchMadeRef.current) {
      // Debounce filter changes to prevent rapid API calls
      const filterTimeout = setTimeout(() => {
        fetchProductsWithSearch(1, false);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(filterTimeout);
    }
  }, [filter, hasRole]); // Remove fetchProducts from dependencies

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Infinite scroll observer (fetch next page from backend)
  useEffect(() => {
    if (!hasMore || loadingMore || loading) {
      return;
    }
    
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLoadingMore(true);
        fetchProductsWithSearch(page + 1, true);
      }
    }, { threshold: 1 });
    
    // Observe both desktop and mobile observer refs
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    if (mobileObserverRef.current) {
      observer.observe(mobileObserverRef.current);
    }
    
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
      if (mobileObserverRef.current) observer.unobserve(mobileObserverRef.current);
    };
  }, [hasMore, loadingMore, loading, page, fetchProductsWithSearch]);

  // Products are now sorted by code column in the backend and filtered by user role
  const filteredAndSortedProducts = useMemo(() => {
    const result = filteredProducts;
    
    return result;
  }, [filteredProducts, isAdmin]);



  // Show modal, then confirm purchase
  const handlePurchase = (productId: string) => {
    setPurchaseConfirmId(productId);
    setPurchaseModalError(null); // Reset any previous errors
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseConfirmId) return;
    setPurchasingProduct(purchaseConfirmId);
    setPurchaseLoading(true);
    setError(null);
    setPurchaseModalError(null); // Reset modal error
    try {
      const token = await getToken();
      
      const requestBody = { productId: purchaseConfirmId };
      
      const response = await fetch(`/api/v1/catalog/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Check multiple possible error field names
        const errorMessage = errorData.error || errorData.detail || errorData.message || '';
        
        // Handle specific error cases
        if (errorMessage && (errorMessage.toLowerCase().includes('insufficient credits') || errorMessage.toLowerCase().includes('onvoldoende credits'))) {
          setPurchaseModalError('Je hebt onvoldoende credits om dit exameninstrument in te kopen.');
          return;
        }
        
        if (errorMessage && errorMessage.toLowerCase().includes('already purchased')) {
          setPurchaseModalError('Je hebt dit product al gekocht.');
          return;
        }
        
        if (errorMessage && errorMessage.toLowerCase().includes('not found')) {
          setPurchaseModalError('Product niet gevonden.');
          return;
        }
        
        if (errorMessage && errorMessage.toLowerCase().includes('forbidden')) {
          setPurchaseModalError('Je bent niet geautoriseerd om dit product te kopen.');
          return;
        }
        
        // If we have a specific error message from the server, use it
        if (errorMessage && errorMessage.trim()) {
          setPurchaseModalError(errorMessage);
          return;
        }
        
        // Only show generic message if we truly don't know what went wrong
        setPurchaseModalError('Er is een onbekende fout opgetreden bij het kopen van het product.');
        return;
      }
      
      const result = await response.json();
      
      // Update the product to show as purchased
      setProducts(prev => prev.map(product =>
        product.id === purchaseConfirmId
          ? { ...product, isPurchased: true, downloadUrl: result.downloadUrl }
          : product
      ));
      setPurchaseConfirmId(null);
      
      // Refresh credit balance to update header
      await refreshCredits();
    } catch (err) {
      // console.error('💥 Purchase error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if this is an insufficient credits error
      if (errorMessage.toLowerCase().includes('insufficient credits') || errorMessage.toLowerCase().includes('onvoldoende credits')) {
        setPurchaseModalError('Je hebt onvoldoende credits om dit exameninstrument in te kopen.');
      } else if (errorMessage.toLowerCase().includes('already purchased')) {
        setPurchaseModalError('Je hebt dit product al gekocht.');
      } else if (errorMessage.toLowerCase().includes('not found')) {
        setPurchaseModalError('Product niet gevonden.');
      } else if (errorMessage.toLowerCase().includes('forbidden')) {
        setPurchaseModalError('Je bent niet geautoriseerd om dit product te kopen.');
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        setPurchaseModalError('Netwerkfout. Controleer je internetverbinding en probeer het opnieuw.');
      } else if (errorMessage.trim() && errorMessage !== 'Unknown error') {
        // If we have a specific error message, use it
        setPurchaseModalError(errorMessage);
      } else {
        // Only show generic message if we truly don't know what went wrong
        setPurchaseModalError('Er is een onbekende fout opgetreden bij het kopen van het product.');
      }
    } finally {
      setPurchasingProduct(null);
      setPurchaseLoading(false);
    }
  };

  const handleReview = (product: ExamProduct) => {
    setSelectedProduct(product);
    setPdfViewerOpen(true);
  };

  const handleEdit = (product: ExamProduct) => {
    router.push(`/catalogus/edit/${product.id}`);
  };

  const handleDownload = async (productId: string, versionId?: string) => {
    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) {
      setError('Product not found');
      return;
    }
    
    // If no version is specified, check if there's a selected version for this product
    let selectedVersionId = versionId;
    let latestEnabledVersion: any = null;
    if (!selectedVersionId) {
      // Check if user has selected a specific version for this product
      const selectedVersion = selectedVersions[productId];
      if (selectedVersion) {
        selectedVersionId = selectedVersion.versionId;
      } else if (product.versions && product.versions.length > 0) {
        // Fallback: automatically select the latest enabled version
        latestEnabledVersion = product.versions.find(v => {
          const isEnabled = v.isEnabled !== undefined ? v.isEnabled : v.is_enabled;
          return isEnabled === true;
        }) || product.versions.find(v => v.isLatest) || product.versions[0];
      }
      
      if (latestEnabledVersion) {
        // If the version doesn't have an ID, we need to fetch the product versions to get the actual ID
        if (!latestEnabledVersion.id) {
          try {
            const { data: versionsData, error: versionsError } = await api.getProductVersions(productId);
            
            if (versionsError) {
              // console.warn('⚠️ Failed to fetch product versions, using version string as fallback:', versionsError);
              selectedVersionId = latestEnabledVersion.version;
            } else if (versionsData && Array.isArray(versionsData)) {
              // Find the matching version by version string
              const matchingVersion = versionsData.find((v: any) => v.version === latestEnabledVersion.version);
              if (matchingVersion && matchingVersion.id) {
                selectedVersionId = matchingVersion.id;
              } else {
                // console.warn('⚠️ Version not found in API response, using version string as fallback');
                selectedVersionId = latestEnabledVersion.version;
              }
            } else {
              // console.warn('⚠️ Invalid versions data from API, using version string as fallback');
              selectedVersionId = latestEnabledVersion.version;
            }
          } catch (error) {
            // console.warn('⚠️ Error fetching product versions, using version string as fallback:', error);
            selectedVersionId = latestEnabledVersion.version;
          }
        } else {
          selectedVersionId = latestEnabledVersion.id;
        }
      }
    }
    
    // Set up download modal
    setDownloadProduct(product);
    setDownloadVersionId(selectedVersionId);
    
    // Determine the version string to display
    let versionString = 'Unknown';
    if (versionId && product.versions) {
      // If a specific version was requested, find its version string
      const selectedVersion = product.versions.find(v => v.id === versionId);
      versionString = selectedVersion?.version || 'Unknown';
    } else if (selectedVersions[productId]) {
      // If using a previously selected version, use that
      versionString = selectedVersions[productId].versionString;
    } else if (latestEnabledVersion) {
      // If auto-selecting, use the auto-selected version
      versionString = latestEnabledVersion.version;
    }
    
    setDownloadVersionString(versionString);
    setDownloadModalOpen(true);
  };

  const handleVersionSelect = (productId: string, version: string, versionId?: string) => {
    // Track the selected version for this product
    setSelectedVersions(prev => ({
      ...prev,
      [productId]: {
        versionId: versionId || version,
        versionString: version
      }
    }));
  };



  const handleOpenFeedback = (product: ExamProduct) => {
    setFeedbackProduct(product);
    setFeedbackOpen(true);
  };
  const handleSubmitFeedback = async (feedback: any) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/v1/catalog/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }
      const result = await response.json();
      // Optionally show a success message
    } catch (err) {
      // console.error('Feedback submission error:', err);
      // Optionally show an error message
    } finally {
      setFeedbackOpen(false);
      setFeedbackProduct(null);
    }
  };

  // Handler for delete
  const handleDeleteProduct = async (productId: string) => {
    setDeleting(true);
    try {
      const { error } = await api.deleteProduct(productId);

      if (error) {
        throw new Error(error.detail || 'Failed to delete product');
      }

      // Remove from local state
      setProducts(products.filter(p => p.id !== productId));
      setDeleteProductId(null);
      toast.success('Product successfully deleted');
    } catch (error) {
      // console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: 'draft' | 'available') => {
    // Find the product to validate
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // If trying to publish, check if product is ready
    if (newStatus === 'available' && !isProductReadyForPublication(product)) {
      // Don't show error message, just prevent the action
      return;
    }

    setUpdatingStatus(productId);
    try {
      const { error } = await api.updateProductStatus(productId, newStatus);

      if (error) {
        throw new Error(error.detail || 'Failed to update product status');
      }

      setProducts(products.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update product status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatCohort = (cohort: string) => {
    // Convert YYYY-YY format to readable format
    // e.g., "2025-26" becomes "2025-2026"
    const [startYear, endYear] = cohort.split('-');
    return `${startYear}-${endYear}`;
  };

  const formatCredits = (credits: number) => {
    return `${credits} credits`;
  };

  const handleVoucherActivated = (newBalance: number) => {
    setShowWelcomeBanner(false);
    refreshCredits(); // Update credit display
  };

  // Helper to get product cost for modal
  const purchaseProduct = purchaseConfirmId ? products.find(p => p.id === purchaseConfirmId) : null;

  // Reset checkbox when modal closes
  useEffect(() => {
    if (!purchaseConfirmId) setPurchaseTermsChecked(false);
  }, [purchaseConfirmId]);

  // Debug purchase modal state
  useEffect(() => {
  }, [purchaseConfirmId, purchaseProduct]);

  // Loading skeleton component for better perceived performance
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
          <Skeleton className="h-4 w-16" /> {/* Code */}
          <Skeleton className="h-4 w-32" /> {/* Title */}
          <Skeleton className="h-4 w-48" /> {/* Description */}
          <Skeleton className="h-4 w-20" /> {/* Credits */}
          <Skeleton className="h-4 w-24" /> {/* Cohort */}
          <Skeleton className="h-4 w-16" /> {/* Version */}
          <Skeleton className="h-4 w-20" /> {/* Actions */}
        </div>
      ))}
    </div>
  );

  // Check welcome banner status
  useEffect(() => {
    const checkWelcomeBanner = async () => {
      if (!isSignedIn || !user) return;
      
      try {
        const { data, error } = await api.getWelcomeVoucherStatus();

        if (error) {
          // console.error('❌ Error checking welcome banner status:', error);
          return;
        }

        const shouldShow = (data as any).should_show_banner;
        
        setShowWelcomeBanner(shouldShow);
      } catch (error) {
        // console.error('💥 Exception checking welcome banner status:', error);
      } finally {
        setWelcomeBannerLoading(false);
      }
    };

    checkWelcomeBanner();
  }, [isSignedIn, user, api]);

  // Mark first login
  useEffect(() => {
    const markFirstLogin = async () => {
      if (!isSignedIn || !user) return;
      
      try {
        const { error } = await api.markFirstLogin();
        
        if (error) {
          // console.error('Error marking first login:', error);
          // Don't show error to user for first login marking - it's not critical
        } else {
          // console.log('✅ First login marked successfully');
        }
      } catch (error) {
        // console.error('Exception marking first login:', error);
        // Don't show error to user for first login marking - it's not critical
      }
    };

    markFirstLogin();
  }, [isSignedIn, user, api]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exameninstrumenten</h1>
        </div>

        {/* Welcome Banner */}
        {(() => {
          return !welcomeBannerLoading && showWelcomeBanner ? (
            <WelcomeBanner onVoucherActivated={handleVoucherActivated} />
          ) : null;
        })()}

        {/* Search Bar */}
        <div className="mb-10">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-10 w-10" />
            <Input
              type="text"
              placeholder="Zoek op code of titel..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-16 h-20 !text-3xl w-full shadow-lg border-2 border-examen-cyan focus:border-examen-cyan focus:ring-2 focus:ring-examen-cyan/30 transition-all"
            />
            {/* Search loading indicator */}
            {searchLoading && (
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-8 w-8 animate-spin text-examen-cyan" />
              </div>
            )}
            {/* Search results count */}
            {searchTerm && !searchLoading && (
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                <Badge variant="secondary" className="text-sm">
                  {products.length} resultaten
                </Badge>
              </div>
            )}
          </div>
          
          {/* Search status message */}
          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              {searchLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-examen-cyan" />
                  Zoeken naar "{searchTerm}"...
                </span>
              ) : (
                <span>
                  {products.length > 0 
                    ? `Gevonden: ${products.length} resultaten voor "${searchTerm}"`
                    : `Geen resultaten gevonden voor "${searchTerm}"`
                  }
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-row gap-4 mb-8 overflow-x-auto flex-nowrap">
          <button
            className={cn(
              'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
              filter === 'alles'
                ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
            )}
            onClick={() => setFilter('alles')}
          >
            Alles
          </button>
          <button
            className={cn(
              'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
              filter === 'ingekocht'
                ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
            )}
            onClick={() => setFilter('ingekocht')}
          >
            Ingekocht
          </button>
        </div>

        {/* Credit Banner */}
        <CreditBanner onOrderCredits={openModal} hideWhenWelcomeBannerShown={showWelcomeBanner} />
        
        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Products Table */}
        {/* Responsive Table/Card Layout */}
        {/* Table for md+ screens */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          {isPageLoading ? (
            <div className="p-8">
              <LoadingSkeleton />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">
                        Code
                      </TableHead>
                      <TableHead className="font-semibold">Titel</TableHead>
                      <TableHead className="font-semibold">Beschrijving</TableHead>
                      <TableHead className="font-semibold">Credits</TableHead>
                      <TableHead className="font-semibold">v.a. Cohort</TableHead>
                      <TableHead className="font-semibold text-center">Versie</TableHead>

                                                                                              {isAdmin && (
                           <TableHead className="font-semibold text-center">Status</TableHead>
                          )}
                      <TableHead className="font-semibold text-center">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* New Product Input Row - Admin Only */}
                    {isAdmin && (
                      <TableRow>
                        <TableCell>
                          <Input
                            value={newProduct.code}
                            onChange={e => handleNewProductChange('code', e.target.value)}
                            placeholder="Code"
                            className="min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newProduct.title}
                            onChange={e => handleNewProductChange('title', e.target.value)}
                            placeholder="Titel"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newProduct.description}
                            onChange={e => handleNewProductChange('description', e.target.value)}
                            placeholder="Beschrijving"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={newProduct.credits}
                            onChange={e => handleNewProductChange('credits', e.target.value)}
                            placeholder="Credits"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newProduct.cohort}
                            onChange={e => handleNewProductChange('cohort', e.target.value)}
                            placeholder="Cohort"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            value="N/A"
                            disabled
                            className="text-center text-gray-500 bg-gray-100 cursor-not-allowed"
                            title="Versies worden aangemaakt na het opslaan van het product"
                          />
                        </TableCell>

                        {isAdmin && (
                          <TableCell className="text-center">
                                                          <div className="flex items-center justify-center space-x-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${
                                    newProduct.status === 'available' 
                                      ? 'bg-green-500' 
                                      : 'bg-blue-500'
                                  }`}
                                  title={newProduct.status === 'available' ? 'Published' : 'Draft'}
                                />
                              <select
                                value={newProduct.status || 'draft'}
                                onChange={e => handleNewProductChange('status', e.target.value)}
                                disabled={!newProduct.code || !newProduct.title || !newProduct.description || !newProduct.credits}
                                className={`text-xs px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-examen-cyan focus:border-examen-cyan disabled:opacity-50 ${
                                  newProduct.status === 'available' 
                                    ? 'text-green-600 font-medium' 
                                    : !newProduct.code || !newProduct.title || !newProduct.description || !newProduct.credits
                                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                    : 'text-blue-600 font-medium'
                                }`}
                                title={!newProduct.code || !newProduct.title || !newProduct.description || !newProduct.credits ? 'Complete all required fields to enable status change' : ''}
                              >
                                <option value="draft" className="text-blue-600">Draft</option>
                                <option value="available" className="text-green-600">Published</option>
                              </select>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-examen-cyan text-white"
                              onClick={handleSaveNewProduct}
                              disabled={savingNewProduct || !newProduct.code || !newProduct.title || !newProduct.description || !newProduct.credits}
                            >
                              {savingNewProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Opslaan'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleClearNewProduct}
                              disabled={savingNewProduct}
                            >
                              Wissen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredAndSortedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-500">
                          {searchTerm ? 'Geen examens gevonden voor je zoekopdracht.' : 'Geen examens beschikbaar.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedProducts.map((product) => {
                        return (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono font-medium">
                            {product.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            <TruncatedText 
                              text={product.title} 
                              maxWords={8}
                              showExpandButton={false}
                            />
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <TruncatedText 
                              text={product.description} 
                              maxWords={30}
                              showExpandButton={false}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCredits(product.credits || 0)}
                          </TableCell>
                          <TableCell>
                            {formatCohort(product.cohort)}
                          </TableCell>
                          <TableCell>
                            <VersionDropdown
                              versions={product.versions}
                              currentVersion={product.version || (product.versions.length > 0 ? product.versions[0].version : "N/A")}
                              isPurchased={product.isPurchased}
                              onVersionSelect={(version, versionId) => handleVersionSelect(product.id, version, versionId)}
                            />
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${
                                    product.status === 'available' 
                                      ? 'bg-green-500' 
                                      : 'bg-blue-500'
                                  }`}
                                  title={product.status === 'available' ? 'Published' : 'Draft'}
                                />
                                <select
                                  value={product.status || 'draft'}
                                  onChange={(e) => handleStatusChange(product.id, e.target.value as 'draft' | 'available')}
                                  disabled={updatingStatus === product.id || (!isProductReadyForPublication(product) && product.status === 'draft')}
                                  className={`text-xs px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-examen-cyan focus:border-examen-cyan disabled:opacity-50 ${
                                    product.status === 'available' 
                                      ? 'text-green-600 font-medium' 
                                      : !isProductReadyForPublication(product) && product.status === 'draft'
                                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                      : 'text-blue-600 font-medium'
                                  }`}
                                  title={!isProductReadyForPublication(product) && product.status === 'draft' ? 'Product not ready for publication' : ''}
                                >
                                  <option value="draft" className="text-blue-600">Draft</option>
                                  <option value="available" className="text-green-600">Published</option>
                                </select>
                              </div>
                              {updatingStatus === product.id && (
                                <div className="mt-1">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-examen-cyan" />
                                </div>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="align-top">
                            <div className="flex flex-col space-y-2 min-w-[120px]">
                              {!product.isPurchased && product.hasPreviewDocument && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReview(product)}
                                  className="flex items-center justify-center w-full"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Inkijken
                                </Button>
                              )}
                              {product.isPurchased ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleDownload(product.id)}
                                  disabled={downloadingProduct === product.id}
                                  className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700"
                                >
                                  {downloadingProduct === product.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-1" />
                                  )}
                                  {downloadingProduct === product.id ? 'Downloaden...' : 'Downloaden'}
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handlePurchase(product.id)}
                                  disabled={purchasingProduct === product.id || product.status === 'draft'}
                                  className={cn(
                                    "flex items-center justify-center w-full bg-examen-cyan text-white border border-examen-cyan hover:bg-examen-cyan/90 transition-all",
                                    (purchasingProduct === product.id || product.status === 'draft') ? "opacity-80" : ""
                                  )}
                                  title={product.status === 'draft' ? 'Draft examens kunnen niet worden gekocht' : ''}
                                >
                                  {purchasingProduct === product.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                  )}
                                  {purchasingProduct === product.id ? 'Inkopen...' : (product.status === 'draft' ? 'Draft' : 'Inkopen')}
                                </Button>
                              )}
                              {product.isPurchased && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenFeedback(product)}
                                  className="flex items-center justify-center w-full"
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Feedback
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                  className="flex items-center justify-center w-full"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Infinite scroll loader */}
              <div ref={observerRef} />
              {loadingMore && (
                <div className="p-4 text-center">
                  <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2 text-examen-cyan" />
                  <span className="text-gray-500">Meer examens laden...</span>
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <div className="p-4 text-center text-gray-400 text-sm">Alle examens geladen</div>
              )}
            </>
          )}
        </div>
        {/* Card layout for mobile (below md) */}
        <div className="md:hidden">
          {isPageLoading ? (
            <div className="p-8">
              <LoadingSkeleton />
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Geen examens gevonden voor je zoekopdracht.' : 'Geen examens beschikbaar.'}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-6">
                {filteredAndSortedProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-examen-cyan text-lg">{product.code}</span>
                      <span className="text-xs text-gray-500">{formatCohort(product.cohort)}</span>
                    </div>
                    <div className="font-bold text-lg mb-1">
                      <TruncatedText text={product.title} maxWords={8} showExpandButton={false} />
                    </div>
                    <div className="text-gray-700 text-sm mb-1">
                      <TruncatedText text={product.description} maxWords={30} showExpandButton={false} />
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-1">
                      <span className="font-semibold">{formatCredits(product.credits || 0)} credits</span>
                      <span className="ml-auto"><VersionDropdown versions={product.versions} currentVersion={product.version} isPurchased={product.isPurchased} onVersionSelect={(version, versionId) => handleVersionSelect(product.id, version, versionId)} /></span>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      {!product.isPurchased && product.hasPreviewDocument && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(product)}
                          className="flex items-center justify-center w-full"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Inkijken
                        </Button>
                      )}
                      {product.isPurchased ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(product.id)}
                          disabled={downloadingProduct === product.id}
                          className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700"
                        >
                          {downloadingProduct === product.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          {downloadingProduct === product.id ? 'Downloaden...' : 'Downloaden'}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePurchase(product.id)}
                          disabled={purchasingProduct === product.id || product.status === 'draft'}
                          className={cn(
                            "flex items-center justify-center w-full bg-examen-cyan text-white border border-examen-cyan hover:bg-examen-cyan/90 transition-all",
                            (purchasingProduct === product.id || product.status === 'draft') ? "opacity-80" : ""
                          )}
                          title={product.status === 'draft' ? 'Draft examens kunnen niet worden gekocht' : ''}
                        >
                          {purchasingProduct === product.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 mr-1" />
                          )}
                          {purchasingProduct === product.id ? 'Inkopen...' : (product.status === 'draft' ? 'Draft' : 'Inkopen')}
                        </Button>
                      )}
                      {product.isPurchased && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenFeedback(product)}
                          className="flex items-center justify-center w-full"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Feedback
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="flex items-center justify-center w-full"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Bewerken
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Infinite scroll loader */}
              <div ref={mobileObserverRef} />
              {loadingMore && (
                <div className="p-4 text-center">
                  <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2 text-examen-cyan" />
                  <span className="text-gray-500">Meer examens laden...</span>
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <div className="p-4 text-center text-gray-400 text-sm">Alle examens geladen</div>
              )}
            </>
          )}
        </div>
      </div>
      {feedbackProduct && (
        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={handleSubmitFeedback}
          product={{
            id: feedbackProduct.id,
            code: feedbackProduct.code,
            title: feedbackProduct.title,
            versions: feedbackProduct.versions.map(v => ({ version: v.version, isLatest: v.isLatest })),
          }}
          defaultVersion={feedbackProduct.versions.find(v => v.isLatest)?.version || feedbackProduct.version}
        />
      )}
      {downloadProduct && (
        <DownloadModal
          open={downloadModalOpen}
          onClose={() => {
            setDownloadModalOpen(false);
            setDownloadProduct(null);
            setDownloadVersionId(undefined);
            setDownloadVersionString(undefined);
            // Clear the selected version for this product to prevent affecting future downloads
            if (downloadProduct) {
              setSelectedVersions(prev => {
                const newState = { ...prev };
                delete newState[downloadProduct.id];
                return newState;
              });
            }
          }}
          product={{
            id: downloadProduct.id,
            code: downloadProduct.code,
            title: downloadProduct.title,
            versions: downloadProduct.versions.map(v => ({ version: v.version, isLatest: v.isLatest })),
          }}
          versionId={downloadVersionId}
          versionString={downloadVersionString}
        />
      )}
      {/* Delete confirmation modal */}
      <Dialog open={!!deleteProductId} onOpenChange={open => !open && setDeleteProductId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
          </DialogHeader>
          <div className="py-4">Weet je zeker dat je dit examenproduct wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProductId(null)} disabled={deleting}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDeleteProduct(deleteProductId!)}
              disabled={deleting}
              className="transition-colors hover:bg-red-100 hover:text-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Purchase confirmation modal */}
      <Dialog open={!!purchaseConfirmId} onOpenChange={open => {
        if (!open) {
          setPurchaseConfirmId(null);
          setPurchaseModalError(null); // Reset error when modal closes
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bevestig aankoop</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {purchaseProduct && (
              <>
                Dit product kost <span className="font-semibold">{purchaseProduct.credits} credits</span>. Bevestig hieronder je aankoop.
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="purchase-terms"
              checked={purchaseTermsChecked}
              onChange={e => {
                setPurchaseTermsChecked(e.target.checked);
              }}
              className="accent-examen-cyan w-5 h-5"
            />
            <label htmlFor="purchase-terms" className="text-sm select-none">
              Ik ga akkoord met de{' '}
              <button
                type="button"
                onClick={downloadInkoopvoorwaarden}
                className="underline text-examen-cyan hover:text-examen-cyan/80 cursor-pointer"
              >
                inkoopvoorwaarden
              </button>
            </label>
          </div>
          {purchaseModalError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      {(purchaseModalError.toLowerCase().includes('insufficient credits') || purchaseModalError.toLowerCase().includes('onvoldoende credits')) 
                        ? 'Aankoop niet mogelijk. Je hebt onvoldoende credits'
                        : 'Aankoop niet mogelijk'
                      }
                    </h3>
                  </div>
                </div>
                {(purchaseModalError.toLowerCase().includes('insufficient credits') || purchaseModalError.toLowerCase().includes('onvoldoende credits')) && (
                  <Button
                    onClick={openModal}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Credits Bestellen
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseConfirmId(null)} disabled={purchaseLoading}>
              Annuleren
            </Button>
            <Button
              variant="default"
              className="bg-examen-cyan text-white"
              onClick={() => {
                handleConfirmPurchase();
              }}
              disabled={purchaseLoading || !purchaseTermsChecked}
            >
              {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* PDF Viewer Modal */}
      {selectedProduct && (
        <PDFViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedProduct(null);
          }}
          pdfUrl={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/catalog/preview/${selectedProduct.id}/content`}
          title={`Preview: ${selectedProduct.title}`}
        />
      )}

      {/* 
       * DocumentList Integration Example:
       * 
       * To integrate the DocumentList component with document preview functionality:
       * 
       * 1. Add state for documents and document preview:
       * const [documents, setDocuments] = useState<Document[]>([]);
       * const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
       * const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
       * 
       * 2. Add handlers for document management:
       * const handleSetPreview = (documentId: string) => {
       *   setDocuments(prev => prev.map(doc => ({
       *     ...doc,
       *     isPreview: doc.id === documentId
       *   })));
       * };
       * 
       * const handlePreviewDocument = (document: Document) => {
       *   setSelectedDocument(document);
       *   setDocumentPreviewOpen(true);
       * };
       * 
       * 3. Add the DocumentList component where needed:
       * <DocumentList
       *   documents={documents}
       *   versionId={versionId}
       *   onDelete={handleDeleteDocument}
       *   onSetPreview={handleSetPreview}
       *   onPreviewDocument={handlePreviewDocument}
       * />
       * 
       * 4. Add the PDF viewer for document previews:
       * {selectedDocument && (
       *   <PDFViewer
       *     isOpen={documentPreviewOpen}
       *     onClose={() => {
       *       setDocumentPreviewOpen(false);
       *       setSelectedDocument(null);
       *     }}
       *     pdfUrl={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/catalog/preview/${selectedProduct.id}/content`}
       *     title={`Document Preview: ${selectedDocument.name}`}
       *   />
       * )}
       * 
       * The existing "Inkijken" button will continue to work as before,
       * but now you can also manage individual document previews through the DocumentList.
       */}

    </div>
  );
} 