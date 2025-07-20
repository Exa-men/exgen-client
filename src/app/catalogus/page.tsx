"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, Eye, Download, ShoppingCart, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import UnifiedHeader from '../components/UnifiedHeader';
import PDFViewer from '../components/PDFViewer';
import TruncatedText from '../components/TruncatedText';
import VersionDropdown from '../components/VersionDropdown';
import FeedbackModal from '../components/FeedbackModal';
import { cn } from '../../lib/utils';

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
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  
  const [products, setProducts] = useState<ExamProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ExamProduct[]>([]); // for mock all data
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 10;
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [purchasingProduct, setPurchasingProduct] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExamProduct | null>(null);
  const [filter, setFilter] = useState<'alles' | 'ingekocht' | 'beschikbaar'>('alles');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackProduct, setFeedbackProduct] = useState<ExamProduct | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch exam products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSignedIn) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Simulate fetching all products (mocked)
        // In real app, fetch only PAGE_SIZE and use page param
        const token = await getToken();
        const response = await fetch(`/api/catalog/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();
        setAllProducts(data.products || []);
        setProducts((data.products || []).slice(0, PAGE_SIZE));
        setHasMore((data.products || []).length > PAGE_SIZE);
        setPage(1);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load exam products');
        setAllProducts([]);
        setProducts([]);
        setHasMore(false);
        setPage(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isSignedIn, getToken, backendUrl]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLoadingMore(true);
        setTimeout(() => {
          setProducts(prev => {
            const nextPage = page + 1;
            const nextProducts = allProducts.slice(0, nextPage * PAGE_SIZE);
            setHasMore(nextProducts.length < allProducts.length);
            setPage(nextPage);
            return nextProducts;
          });
          setLoadingMore(false);
        }, 700); // Simulate network delay
      }
    }, { threshold: 1 });
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [hasMore, loadingMore, loading, allProducts, page]);

  // Filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product =>
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filter === 'ingekocht') {
      filtered = filtered.filter(product => product.isPurchased);
    } else if (filter === 'beschikbaar') {
      filtered = filtered.filter(product => !product.isPurchased);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle cohort sorting (treat as string)
      if (sortField === 'validFrom') {
        // Sort cohorts as strings (YYYY-YY format)
        aValue = aValue;
        bValue = bValue;
      }

      // Handle cost sorting
      if (sortField === 'cost') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, sortField, sortDirection, filter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePurchase = async (productId: string) => {
    setPurchasingProduct(productId);
    try {
      const token = await getToken();
      const response = await fetch(`/api/catalog/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Purchase failed');
      }

      const result = await response.json();
      
      // Update the product to show as purchased
      setProducts(prev => prev.map(product =>
        product.id === productId
          ? { ...product, isPurchased: true, downloadUrl: result.downloadUrl }
          : product
      ));
      
      console.log('✅ Purchase successful, remaining credits:', result.remainingCredits);
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase product');
    } finally {
      setPurchasingProduct(null);
    }
  };

  const handleReview = (product: ExamProduct) => {
    console.log('🔍 Inkijken button clicked for product:', product);
    setSelectedProduct(product);
    setPdfViewerOpen(true);
    console.log('📄 PDF viewer should now be open');
  };

  const handleDownload = (downloadUrl: string) => {
    // Trigger download
    window.open(downloadUrl, '_blank');
  };

  const handleVersionDownload = (version: string, downloadUrl: string) => {
    console.log(`📥 Downloading version ${version} from: ${downloadUrl}`);
    window.open(downloadUrl, '_blank');
  };

  const handleOpenFeedback = (product: ExamProduct) => {
    setFeedbackProduct(product);
    setFeedbackOpen(true);
  };
  const handleSubmitFeedback = (feedback: any) => {
    console.log('Feedback submitted:', feedback);
    setFeedbackOpen(false);
    setFeedbackProduct(null);
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
          <div className="text-gray-600">Loading...        </div>
      </div>

      {/* PDF Viewer Overlay */}
      {selectedProduct && (
        <>
          {console.log('🎯 Rendering PDF viewer with product:', selectedProduct)}
          <PDFViewer
            isOpen={pdfViewerOpen}
            onClose={() => {
              console.log('❌ Closing PDF viewer');
              setPdfViewerOpen(false);
              setSelectedProduct(null);
            }}
            pdfUrl={`/api/catalog/preview/${selectedProduct.id}`}
            title={selectedProduct.title}
          />
        </>
      )}
    </div>
  );
}

  if (!isSignedIn) {
    return null; // Will redirect
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Catalogus</h1>
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

        {/* Error Message */}
        {error && (
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
                              onDownload={handleVersionDownload}
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
                                  onClick={() => handleDownload(product.downloadUrl!)}
                                  className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Downloaden
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
                      <span className="ml-auto"><VersionDropdown versions={product.versions} currentVersion={product.version} isPurchased={product.isPurchased} onDownload={handleVersionDownload} /></span>
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
                          onClick={() => handleDownload(product.downloadUrl!)}
                          className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Downloaden
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
    </div>
  );
} 