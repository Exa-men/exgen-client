"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, Eye, Download, ShoppingCart, Loader2, MessageSquare, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';

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

interface Version {
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  isLatest: boolean;
  isEnabled?: boolean; // Only present for admin users
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

type SortField = 'code' | 'title' | 'credits' | 'cohort';
type SortDirection = 'asc' | 'desc';

export default function CatalogusPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { userRole, isAdmin } = useRoleContext();
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
  const [showCreditsError, setShowCreditsError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
  // State for delete modal
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // State for purchase terms checkbox
  const [purchaseTermsChecked, setPurchaseTermsChecked] = useState(false);
  
  // State for status updates
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // State for welcome banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [welcomeBannerLoading, setWelcomeBannerLoading] = useState(true);

  // Add scroll velocity tracking for better performance
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollTimeRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Add request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add scroll direction detection
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollYRef = useRef<number>(0);

  // Add scroll position memory
  const scrollPositionRef = useRef<number>(0);

  // Dynamic page sizes for optimal performance
  const INITIAL_PAGE_SIZE = 10;      // Fast initial load
  const SCROLL_PAGE_SIZE = 25;       // Bigger batches on scroll
  const FAST_SCROLL_PAGE_SIZE = 40;  // Very fast scrolling
  const VELOCITY_THRESHOLD = 0.5;    // Threshold for fast scrolling (px/ms)
  
  // Get optimal page size based on context and scroll velocity
  const getOptimalPageSize = useCallback((pageNum: number, velocity: number) => {
    if (pageNum === 1) {
      return INITIAL_PAGE_SIZE; // Fast initial load
    }
    
    // Adaptive sizing based on scroll velocity
    if (velocity > VELOCITY_THRESHOLD) {
      return FAST_SCROLL_PAGE_SIZE; // Very fast scrolling
    }
    
    return SCROLL_PAGE_SIZE; // Normal scrolling
  }, []);
  
  // Add simple caching system
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Check if data is cached and fresh
  const getCachedData = (key: string) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };
  
  // Store data in cache
  const setCachedData = (key: string, data: any) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache entries
    const now = Date.now();
    for (const [cacheKey, cacheValue] of cacheRef.current.entries()) {
      if (now - cacheValue.timestamp > CACHE_DURATION) {
        cacheRef.current.delete(cacheKey);
      }
    }
  };
  
  // Generate cache key
  const getCacheKey = (pageNum: number, searchTerm: string, filter: string) => {
    return `products_${pageNum}_${searchTerm}_${filter}`;
  };
  
  // Add virtual scrolling hint system
  const [shouldUseVirtualScrolling, setShouldUseVirtualScrolling] = useState(false);
  const VIRTUAL_SCROLLING_THRESHOLD = 1000; // Enable for 1000+ items
  
  // Performance optimization for large lists
  const getVisibleProducts = useCallback(() => {
    if (!shouldUseVirtualScrolling) {
      return products;
    }
    
    // For large lists, only render visible items + buffer
    const buffer = 20; // Render 20 items above and below visible area
    const startIndex = Math.max(0, Math.floor(window.scrollY / 100) - buffer);
    const endIndex = Math.min(products.length, Math.ceil((window.scrollY + window.innerHeight) / 100) + buffer);
    
    return products.slice(startIndex, endIndex);
  }, [products, shouldUseVirtualScrolling]);

  // Validation functions for product publication
  const isProductReadyForPublication = (product: ExamProduct): boolean => {
    // Check if basic product information is complete
    const hasBasicInfo = Boolean(product.code && product.title && product.description && product.credits && product.cohort);
    
    // Check if there's at least one version
    const hasVersion = product.versions && product.versions.length > 0;
    
    // Check if there's at least one enabled version (only for admin users)
    const hasEnabledVersion = isAdmin ? 
      (product.versions && product.versions.some(version => version.isEnabled === true)) : 
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
      const token = await getToken();
      const response = await fetch('/api/catalog/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: newProduct.code,
          title: newProduct.title,
          description: newProduct.description,
          cost: Number(newProduct.credits),
          credits: Number(newProduct.credits),
          cohort: newProduct.cohort,

          status: newProduct.status,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409 && errorData.detail === "Product code already exists") {
          throw new Error(`Product code "${newProduct.code}" bestaat al. Gebruik een unieke code.`);
        }
        throw new Error(errorData.detail || errorData.error || 'Failed to add product');
      }
      const created = await response.json();
      
      // Check if product already exists to prevent duplicates
      setProducts((prev) => {
        const exists = prev.some(product => product.id === created.id);
        if (exists) {
          return prev; // Don't add if already exists
        }
        return [created, ...prev];
      });
      
      handleClearNewProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setSavingNewProduct(false);
    }
  };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';



  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (!isSignedIn) return;
    
    // Prevent multiple simultaneous requests
    if (loading && !append) return;
    if (loadingMore && append) return;
    
    // Check cache first (only for non-append requests)
    if (!append) {
      const cacheKey = getCacheKey(pageNum, searchTerm, filter);
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setProducts(cachedData.products);
        setHasMore(cachedData.has_more);
        setLoading(false);
        setPage(cachedData.page);
        return;
      }
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setError(null);
      const token = await getToken();
      
      // Get optimal page size based on context and scroll velocity
      const optimalPageSize = getOptimalPageSize(pageNum, scrollVelocity);
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        size: optimalPageSize.toString(),
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filter) {
        params.append('filter', filter);
      }
      
      const response = await fetch(`/api/v1/catalog/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the response (only for non-append requests)
      if (!append) {
        const cacheKey = getCacheKey(pageNum, searchTerm, filter);
        setCachedData(cacheKey, data);
      }
      
      if (append) {
        setProducts(prev => [...prev, ...data.products]);
        setHasMore(data.has_more);
        setLoadingMore(false);
      } else {
        setProducts(data.products);
        setHasMore(data.has_more);
        setLoading(false);
      }
      
      setPage(data.page);
    } catch (err) {
      // Don't show error if request was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('Error fetching products:', err);
      setError('Failed to load exam products');
      
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [isSignedIn, getToken, searchTerm, filter, loading, loadingMore, getOptimalPageSize, scrollVelocity]);

  // Initial fetch and on search/filter change
  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Infinite scroll observer (fetch next page from backend)
  useEffect(() => {
    if (!hasMore || loadingMore || loading || scrollDirection !== 'down') {
      return;
    }
    
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && scrollDirection === 'down') {
        // Clear any existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        
        // Dynamic debouncing based on scroll velocity
        const baseDelay = 100; // Base delay in ms
        const velocityMultiplier = Math.min(scrollVelocity * 1000, 300); // Cap at 300ms
        const dynamicDelay = baseDelay + velocityMultiplier;
        
        debounceTimeoutRef.current = setTimeout(() => {
          if (!loadingMore && scrollDirection === 'down') {
            setLoadingMore(true);
            // Fix race condition by using setPage callback
            setPage(prevPage => {
              fetchProducts(prevPage + 1, true);
              return prevPage + 1;
            });
          }
        }, dynamicDelay);
      }
    }, { threshold: 0.5 }); // Lower threshold for better detection
    
    // Observe both desktop and mobile observer refs
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    if (mobileObserverRef.current) {
      observer.observe(mobileObserverRef.current);
    }
    
    return () => {
      observer.disconnect();
      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, fetchProducts, scrollVelocity, scrollDirection]);

  // Add smart prefetching for smoother infinite scroll
  const [prefetchedPage, setPrefetchedPage] = useState<number | null>(null);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>();

  // Prefetch next page when user is getting close to the bottom
  useEffect(() => {
    if (!hasMore || loadingMore || loading || prefetchedPage !== null) {
      return;
    }
    
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !prefetchedPage) {
        // Prefetch next page with a longer delay
        prefetchTimeoutRef.current = setTimeout(() => {
          if (!prefetchedPage && !loadingMore) {
            setPrefetchedPage(page + 1);
            // Prefetch with optimal page size based on scroll velocity
            const nextPageSize = getOptimalPageSize(page + 1, scrollVelocity);
            const params = new URLSearchParams({
              page: (page + 1).toString(),
              size: nextPageSize.toString(),
            });
            if (searchTerm) params.append('search', searchTerm);
            if (filter) params.append('filter', filter);
            
            // Silent prefetch - don't update state, just cache
            getToken().then(token => {
              fetch(`/api/v1/catalog/products?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              }).then(res => res.json()).then(data => {
                const cacheKey = getCacheKey(page + 1, searchTerm, filter);
                setCachedData(cacheKey, data);
              }).catch(() => {}); // Silent fail for prefetch
            });
            
            // Reset prefetch flag after a delay
            setTimeout(() => setPrefetchedPage(null), 1000);
          }
        }, 300); // Longer delay for prefetching
      }
    }, { threshold: 0.3, rootMargin: '100px' }); // Start prefetching 100px before visible
    
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    if (mobileObserverRef.current) {
      observer.observe(mobileObserverRef.current);
    }
    
    return () => {
      observer.disconnect();
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, prefetchedPage, page, getOptimalPageSize, scrollVelocity, searchTerm, filter, getToken, getCacheKey, setCachedData]);

  // Filtered and sorted products (sorting only, filtering is now backend-driven)
  const filteredAndSortedProducts = useMemo(() => {
    let sorted = [...products];
    sorted.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (sortField === 'credits') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [products, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Show modal, then confirm purchase
  const handlePurchase = (productId: string) => {
    setPurchaseConfirmId(productId);
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseConfirmId) return;
    setPurchasingProduct(purchaseConfirmId);
    setPurchaseLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`/api/catalog/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: purchaseConfirmId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.toLowerCase().includes('insufficient credits')) {
          setShowCreditsError(true);
          setPurchaseConfirmId(null);
          return;
        }
        throw new Error(errorData.error || 'Purchase failed');
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
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase product');
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
    
    // Set up download modal
    setDownloadProduct(product);
    setDownloadVersionId(versionId);
    setDownloadModalOpen(true);
  };

  const handleVersionDownload = async (version: string, productId: string, versionId?: string) => {
    await handleDownload(productId, versionId);
  };

  const handleOpenFeedback = (product: ExamProduct) => {
    setFeedbackProduct(product);
    setFeedbackOpen(true);
  };
  const handleSubmitFeedback = async (feedback: any) => {
    try {
      const token = await getToken();
      const response = await fetch('/api/catalog/feedback', {
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
      console.error('Feedback submission error:', err);
      // Optionally show an error message
    } finally {
      setFeedbackOpen(false);
      setFeedbackProduct(null);
    }
  };

  // Handler for delete
  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    
    setDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${deleteProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setProducts(products.filter(p => p.id !== deleteProductId));
        setDeleteProductId(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Fout bij het verwijderen van het product');
      }
    } catch (error) {
      setError('Fout bij het verwijderen van het product');
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
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setProducts(products.map(p => 
          p.id === productId ? { ...p, status: newStatus } : p
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Fout bij het bijwerken van de status');
      }
    } catch (error) {
      setError('Fout bij het bijwerken van de status');
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

  // Check welcome banner status
  useEffect(() => {
    const checkWelcomeBanner = async () => {
      if (!isSignedIn || !user) return;
      
      try {
        const token = await getToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/welcome-voucher/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setShowWelcomeBanner(data.should_show_banner);
        }
      } catch (error) {
        console.error('Error checking welcome banner status:', error);
      } finally {
        setWelcomeBannerLoading(false);
      }
    };

    checkWelcomeBanner();
  }, [isSignedIn, user, getToken]);

  // Mark first login
  useEffect(() => {
    const markFirstLogin = async () => {
      if (!isSignedIn || !user) return;
      
      try {
        const token = await getToken();
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/welcome-voucher/mark-first-login`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error marking first login:', error);
      }
    };

    markFirstLogin();
  }, [isSignedIn, user, getToken]);

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

  // Add scroll direction detection
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollYRef.current) {
        setScrollDirection('down');
      } else if (currentScrollY < lastScrollYRef.current) {
        setScrollDirection('up');
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Add performance monitoring
  const [scrollPerformance, setScrollPerformance] = useState({
    averageVelocity: 0,
    maxVelocity: 0,
    totalScrollDistance: 0,
    scrollEvents: 0
  });
  
  const performanceRef = useRef({
    velocities: [] as number[],
    maxVelocity: 0,
    totalDistance: 0,
    eventCount: 0
  });
  
  // Update performance metrics
  useEffect(() => {
    if (scrollVelocity > 0) {
      performanceRef.current.velocities.push(scrollVelocity);
      performanceRef.current.maxVelocity = Math.max(performanceRef.current.maxVelocity, scrollVelocity);
      performanceRef.current.eventCount++;
      
      // Keep only last 50 velocities for average calculation
      if (performanceRef.current.velocities.length > 50) {
        performanceRef.current.velocities.shift();
      }
      
      const average = performanceRef.current.velocities.reduce((a, b) => a + b, 0) / performanceRef.current.velocities.length;
      
      setScrollPerformance({
        averageVelocity: average,
        maxVelocity: performanceRef.current.maxVelocity,
        totalScrollDistance: performanceRef.current.totalDistance,
        scrollEvents: performanceRef.current.eventCount
      });
    }
  }, [scrollVelocity]);

  // Save scroll position before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('catalogScrollPosition', window.scrollY.toString());
    };
    
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Restore scroll position after data loads
  useEffect(() => {
    if (products.length > 0 && !loading) {
      const savedPosition = sessionStorage.getItem('catalogScrollPosition');
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        if (position > 0) {
          setTimeout(() => {
            window.scrollTo(0, position);
            sessionStorage.removeItem('catalogScrollPosition');
          }, 100);
        }
      }
    }
  }, [products.length, loading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exameninstrumenten</h1>
        </div>

        {/* Welcome Banner */}
        {!welcomeBannerLoading && showWelcomeBanner && (
          <WelcomeBanner onVoucherActivated={handleVoucherActivated} />
        )}

        {/* Search Bar */}
        <div className="mb-10">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-10 w-10" />
            <Input
              type="text"
              placeholder="Zoek op code of titel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-16 h-20 !text-3xl w-full shadow-lg border-2 border-examen-cyan focus:border-examen-cyan focus:ring-2 focus:ring-examen-cyan/30 transition-all"
            />
          </div>
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
        {showCreditsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Onvoldoende credits beschikbaar
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Je hebt momenteel onvoldoende credits om dit examen te kopen. Bestel credits om door te gaan.
                  </p>
                </div>
              </div>
              <Button
                onClick={openModal}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Credits Bestellen
              </Button>
            </div>
          </div>
        )}
        
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
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
              <p className="text-gray-600">Laden van examens...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('code')}
                          className="h-auto p-0 font-semibold"
                        >
                          Code
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('title')}
                          className="h-auto p-0 font-semibold"
                        >
                          Titel
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold">Beschrijving</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('credits')}
                          className="h-auto p-0 font-semibold"
                        >
                          Credits
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('cohort')}
                          className="h-auto p-0 font-semibold"
                        >
                          v.a. Cohort
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
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
                      filteredAndSortedProducts.map((product) => (
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
                              onDownload={(version, versionId) => handleVersionDownload(version, product.id, versionId)}
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
                                  Bewerken
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
              <p className="text-gray-600">Laden van examens...</p>
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
                      <span className="ml-auto"><VersionDropdown versions={product.versions} currentVersion={product.version} isPurchased={product.isPurchased} onDownload={(version, versionId) => handleVersionDownload(version, product.id, versionId)} /></span>
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
          }}
          product={{
            id: downloadProduct.id,
            code: downloadProduct.code,
            title: downloadProduct.title,
            versions: downloadProduct.versions.map(v => ({ version: v.version, isLatest: v.isLatest })),
          }}
          versionId={downloadVersionId}
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
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="transition-colors hover:bg-red-100 hover:text-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Purchase confirmation modal */}
      <Dialog open={!!purchaseConfirmId} onOpenChange={open => !open && setPurchaseConfirmId(null)}>
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
              onChange={e => setPurchaseTermsChecked(e.target.checked)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseConfirmId(null)} disabled={purchaseLoading}>
              Annuleren
            </Button>
            <Button
              variant="default"
              className="bg-examen-cyan text-white"
              onClick={handleConfirmPurchase}
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
          pdfUrl={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/catalog/preview/${selectedProduct.id}`}
          title={`Preview: ${selectedProduct.title}`}
        />
      )}

        {/* Performance Debug Panel (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
            <h4 className="font-bold mb-2">Scroll Performance</h4>
            <div className="space-y-1">
              <div>Page Sizes: {INITIAL_PAGE_SIZE}/{SCROLL_PAGE_SIZE}/{FAST_SCROLL_PAGE_SIZE}</div>
              <div>Avg Velocity: {scrollPerformance.averageVelocity.toFixed(2)} px/ms</div>
              <div>Max Velocity: {scrollPerformance.maxVelocity.toFixed(2)} px/ms</div>
              <div>Scroll Events: {scrollPerformance.scrollEvents}</div>
              <div>Direction: {scrollDirection || 'none'}</div>
              <div>Cache Size: {cacheRef.current.size}</div>
              <div>Prefetched: {prefetchedPage || 'none'}</div>
              <div>Virtual Scroll: {shouldUseVirtualScrolling ? 'ON' : 'OFF'}</div>
              <div>Total Items: {products.length + (hasMore ? SCROLL_PAGE_SIZE : 0)}</div>
            </div>
          </div>
        )}

    </div>
  );
} 