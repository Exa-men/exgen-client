"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, Eye, Download, ShoppingCart, Loader2, MessageSquare, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFViewer from '../components/PDFViewer';
import TruncatedText from '../components/TruncatedText';
import VersionDropdown from '../components/VersionDropdown';
import FeedbackModal from '../components/FeedbackModal';
import CreditBanner from '../components/CreditBanner';
import CreditOrderModal from '../components/CreditOrderModal';
import { useCredits } from '../contexts/CreditContext';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useRole } from '../../hooks/use-role';

interface Version {
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  isLatest: boolean;
}

interface ExamProduct {
  id: string;
  code: string;
  title: string;
  description: string;
  cost: number;
  validFrom: string;
  version: string;
  versions: Version[];
  isPurchased: boolean;
  downloadUrl?: string;
}

type SortField = 'code' | 'title' | 'cost' | 'validFrom' | 'version';
type SortDirection = 'asc' | 'desc';

export default function CatalogusPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { userRole, isLoading: roleLoading, isAdmin } = useRole();
  const { refreshCredits } = useCredits();
  
  const [products, setProducts] = useState<ExamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement | null>(null);
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
  const [filter, setFilter] = useState<'alles' | 'ingekocht' | 'beschikbaar'>('alles');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackProduct, setFeedbackProduct] = useState<ExamProduct | null>(null);
  // State for delete modal
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // State for purchase terms checkbox
  const [purchaseTermsChecked, setPurchaseTermsChecked] = useState(false);
  
  // State for credit order modal
  const [creditOrderModalOpen, setCreditOrderModalOpen] = useState(false);

  // State for new product input row
  const [newProduct, setNewProduct] = useState({
    code: '',
    title: '',
    description: '',
    cost: '',
    validFrom: '2025-16',
    version: '1.0',
  });
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  // Handler for input changes
  const handleNewProductChange = (field: string, value: string) => {
    setNewProduct((prev) => ({ ...prev, [field]: value }));
  };

  // Handler for clearing input fields
  const handleClearNewProduct = () => {
    setNewProduct({
      code: '',
      title: '',
      description: '',
      cost: '',
      validFrom: '2025-16',
      version: '1.0',
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
          cost: Number(newProduct.cost),
          validFrom: newProduct.validFrom,
          version: newProduct.version,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      const created = await response.json();
      setProducts((prev) => [created, ...prev]);
      handleClearNewProduct();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setSavingNewProduct(false);
    }
  };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch products from backend with pagination
  const fetchProducts = async (pageNum = 1, append = false) => {
    if (!isSignedIn) return;
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);
      const token = await getToken();
      const response = await fetch(`/api/catalog/products?page=${pageNum}&limit=${PAGE_SIZE}&search=${encodeURIComponent(searchTerm)}&filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      const data = await response.json();
      setProducts(prev => append ? [...prev, ...(data.products || [])] : (data.products || []));
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load exam products');
      setProducts([]);
      setHasMore(false);
      setPage(1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch and on search/filter change
  useEffect(() => {
    fetchProducts(1, false);
  }, [isSignedIn, getToken, backendUrl, searchTerm, filter]);

  // Infinite scroll observer (fetch next page from backend)
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLoadingMore(true);
        fetchProducts(page + 1, true);
      }
    }, { threshold: 1 });
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [hasMore, loadingMore, loading, page, isSignedIn, getToken, backendUrl, searchTerm, filter]);

  // Filtered and sorted products (sorting only, filtering is now backend-driven)
  const filteredAndSortedProducts = useMemo(() => {
    let sorted = [...products];
    sorted.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (sortField === 'cost') {
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
      console.log('✅ Purchase successful, remaining credits:', result.remainingCredits);
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
    try {
      setDownloadingProduct(productId);
      setError(null);
      const token = await getToken();
      
      // Construct download URL
      let downloadUrl = `/api/catalog/download/${productId}`;
      if (versionId) {
        downloadUrl += `?version_id=${versionId}`;
      }
      
      // Add headers using fetch instead of direct link
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'product-package.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download product package');
    } finally {
      setDownloadingProduct(null);
    }
  };

  const handleVersionDownload = async (version: string, productId: string, versionId?: string) => {
    console.log(`📥 Downloading version ${version} for product ${productId}`);
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
      console.log('✅ Feedback submitted successfully:', result);
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
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${deleteProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete product');
      }
      setProducts(prev => prev.filter(p => p.id !== deleteProductId));
      setDeleteProductId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
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

  // Helper to get product cost for modal
  const purchaseProduct = purchaseConfirmId ? products.find(p => p.id === purchaseConfirmId) : null;

  // Reset checkbox when modal closes
  useEffect(() => {
    if (!purchaseConfirmId) setPurchaseTermsChecked(false);
  }, [purchaseConfirmId]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
          <div className="text-gray-600">Loading...        </div>
      </div>

      {/* PDF Viewer Overlay */}
      {selectedProduct && (
        <PDFViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedProduct(null);
          }}
          pdfUrl={`/api/catalog/preview/${selectedProduct.id}`}
          title={selectedProduct.title}
        />
      )}
    </div>
  );
}

  if (!isSignedIn) {
    return null; // Will redirect
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader onOrderCredits={() => setCreditOrderModalOpen(true)} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exameninstrumenten</h1>
        </div>

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
          <button
            className={cn(
              'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
              filter === 'beschikbaar'
                ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
            )}
            onClick={() => setFilter('beschikbaar')}
          >
            Beschikbaar
          </button>
        </div>

        {/* Credit Banner */}
        <CreditBanner onOrderCredits={() => setCreditOrderModalOpen(true)} />
        
        {/* Error Message */}
        {showCreditsError ? (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-row items-center justify-between">
            <span className="text-red-600">
              Je hebt onvoldoende credits. {user && typeof user.publicMetadata?.credits === 'number' ? `Je hebt nog ${user.publicMetadata.credits} credits.` : ''}
            </span>
            <button
              onClick={() => setCreditOrderModalOpen(true)}
              className="px-4 py-2 bg-examen-cyan text-white rounded hover:bg-examen-cyan/90 transition-colors ml-4"
            >
              Bestel Credits
            </button>
          </div>
        ) : error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
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
                          onClick={() => handleSort('cost')}
                          className="h-auto p-0 font-semibold"
                        >
                          Credits
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('validFrom')}
                          className="h-auto p-0 font-semibold"
                        >
                          Cohort
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('version')}
                          className="h-auto p-0 font-semibold"
                        >
                          Versie
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
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
                            value={newProduct.cost}
                            onChange={e => handleNewProductChange('cost', e.target.value)}
                            placeholder="Credits"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newProduct.validFrom}
                            onChange={e => handleNewProductChange('validFrom', e.target.value)}
                            placeholder="Cohort"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={newProduct.version}
                            onChange={e => handleNewProductChange('version', e.target.value)}
                            placeholder="Versie"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-examen-cyan text-white"
                              onClick={handleSaveNewProduct}
                              disabled={savingNewProduct || !newProduct.code || !newProduct.title || !newProduct.description || !newProduct.cost}
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
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                            {formatCredits(product.cost)}
                          </TableCell>
                          <TableCell>
                            {formatCohort(product.validFrom)}
                          </TableCell>
                          <TableCell>
                            <VersionDropdown
                              versions={product.versions}
                              currentVersion={product.version}
                              isPurchased={product.isPurchased}
                              onDownload={(version, versionId) => handleVersionDownload(version, product.id, versionId)}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col space-y-2 min-w-[120px]">
                              {!product.isPurchased && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReview(product)}
                                  className="flex items-center justify-center w-full"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Bekijken
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
                                  disabled={purchasingProduct === product.id}
                                  className={cn(
                                    "flex items-center justify-center w-full bg-examen-cyan text-white border border-examen-cyan hover:bg-examen-cyan/90 transition-all",
                                    purchasingProduct === product.id ? "opacity-80" : ""
                                  )}
                                >
                                  {purchasingProduct === product.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                  )}
                                  {purchasingProduct === product.id ? 'Inkopen...' : 'Inkopen'}
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
                      <span className="text-xs text-gray-500">{formatCohort(product.validFrom)}</span>
                    </div>
                    <div className="font-bold text-lg mb-1">
                      <TruncatedText text={product.title} maxWords={8} showExpandButton={false} />
                    </div>
                    <div className="text-gray-700 text-sm mb-1">
                      <TruncatedText text={product.description} maxWords={30} showExpandButton={false} />
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-1">
                      <span className="font-semibold">{formatCredits(product.cost)}</span>
                      <span className="ml-auto"><VersionDropdown versions={product.versions} currentVersion={product.version} isPurchased={product.isPurchased} onDownload={(version, versionId) => handleVersionDownload(version, product.id, versionId)} /></span>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      {!product.isPurchased && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(product)}
                          className="flex items-center justify-center w-full"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Bekijken
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
                          disabled={purchasingProduct === product.id}
                          className={cn(
                            "flex items-center justify-center w-full bg-examen-cyan text-white border border-examen-cyan hover:bg-examen-cyan/90 transition-all",
                            purchasingProduct === product.id ? "opacity-80" : ""
                          )}
                        >
                          {purchasingProduct === product.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 mr-1" />
                          )}
                          {purchasingProduct === product.id ? 'Inkopen...' : 'Inkopen'}
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
                Dit product kost <span className="font-semibold">{purchaseProduct.cost} credits</span>. Bevestig hieronder je aankoop.
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
              <a
                href="/inkoopvoorwaarden.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-examen-cyan hover:text-examen-cyan/80"
              >
                inkoopvoorwaarden
              </a>
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
      
      {/* Credit Order Modal */}
      <CreditOrderModal
        isOpen={creditOrderModalOpen}
        onClose={() => setCreditOrderModalOpen(false)}
        onSuccess={async () => {
          // Don't close modal immediately - let user see success screen first
          // The modal will be closed when user clicks "Sluiten" button
          // Refresh credits for the user
          await refreshCredits();
        }}
      />
    </div>
  );
} 