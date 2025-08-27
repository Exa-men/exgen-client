"use client";

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Download, ShoppingCart, Loader2, FileText, Calendar, Tag, Euro, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { useCreditModal } from '../../../contexts/CreditModalContext';
import { useApi } from '@/hooks/use-api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

interface ExamProduct {
  id: string;
  code: string;
  title: string;
    description: string;
  cost: number;
  cohort: string;
  version: string;
  isPurchased: boolean;
  downloadUrl?: string;
  longDescription?: string;
  requirements?: string[];
  duration?: string;
  questions?: number;
  level?: string;
  credits?: number; // Added credits to interface
}

export default function ReviewPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  
  const [product, setProduct] = useState<ExamProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseModalError, setPurchaseModalError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { openModal } = useCreditModal();
  const api = useApi();

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      if (!isSignedIn) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await api.getProduct(productId);
        
        if (error) {
          // Check multiple possible error field names
          const errorMessage = error.detail || '';
          
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
        
        setProduct(data as any);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
        // For development, use mock data
        setProduct({
          id: productId,
          code: 'EX001',
          title: 'Basis Examen Nederlands',
          description: 'Fundamentele Nederlandse taalvaardigheid voor MBO niveau 2',
          longDescription: 'Dit examen test de fundamentele Nederlandse taalvaardigheid die vereist is voor MBO niveau 2. Het examen bestaat uit verschillende onderdelen: leesvaardigheid, schrijfvaardigheid, luistervaardigheid en spreekvaardigheid. De vragen zijn gebaseerd op realistische situaties die studenten kunnen tegenkomen in hun dagelijks leven en werk.',
                      cost: 25.00,
            cohort: '2024-25',
            version: '2.1',
          isPurchased: false,
          requirements: [
            'Basis kennis van Nederlandse grammatica',
            'Minimaal 1000 woorden vocabulaire',
            'Begrip van eenvoudige teksten',
            'Kunnen communiceren in dagelijkse situaties'
          ],
          duration: '120 minuten',
          questions: 45,
          level: 'MBO Niveau 2',
          credits: 100 // Mock data for credits
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [isSignedIn, getToken, backendUrl, productId, api]);

  const handlePurchase = async () => {
    if (!isSignedIn) {
      openModal();
      return;
    }

    if (!product) return;
    
    // Show purchase confirmation modal instead of immediate purchase
    setShowPurchaseModal(true);
    setPurchaseModalError(null);
  };

  const handleConfirmPurchase = async () => {
    if (!product) return;
    
    setPurchasing(true);
    setPurchaseModalError(null);
    try {
      const { data, error } = await api.purchaseProduct({
        product_id: product.id,
        version_id: product.version,
      });

      if (error) {
        // Check multiple possible error field names
        const errorMessage = error.detail || '';
        
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

      const result = data as any;
      
      // Update the product to show as purchased
      setProduct(prev => prev ? { ...prev, isPurchased: true, downloadUrl: result.downloadUrl } : null);
      setShowPurchaseModal(false);
      
    } catch (err) {
      console.error('Purchase error:', err);
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
      setPurchasing(false);
    }
  };

  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank');
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
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar catalogus
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
            <p className="text-gray-600">Laden van product details...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : product ? (
          <div className="max-w-4xl mx-auto">
            {/* Product Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="font-mono">{product.code}</Badge>
                    <Badge variant="secondary">{product.level}</Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                  <p className="text-gray-600 text-lg">{product.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-examen-cyan mb-2">
                    {formatCredits(product.credits || 0)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Versie {product.version}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {product.isPurchased ? (
                  <Button
                    onClick={() => handleDownload(product.downloadUrl!)}
                    className="flex items-center bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Examen
                  </Button>
                ) : (
                  <Button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="flex items-center"
                  >
                    {purchasing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    {purchasing ? 'Kopen...' : 'Kopen'}
                  </Button>
                )}
              </div>
            </div>

            {/* Product Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Beschrijving
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">
                      {product.longDescription || product.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Requirements */}
                {product.requirements && product.requirements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Vereisten</CardTitle>
                      <CardDescription>
                        Wat je moet weten voordat je dit examen aflegt
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {product.requirements.map((requirement, index) => (
                          <li key={index} className="flex items-start">
                            <div className="w-2 h-2 bg-examen-cyan rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <span className="text-gray-700">{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Exam Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Examen Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Duur:</span>
                      <span className="font-medium">{product.duration || 'Niet gespecificeerd'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Aantal vragen:</span>
                      <span className="font-medium">{product.questions || 'Niet gespecificeerd'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Niveau:</span>
                      <span className="font-medium">{product.level || 'Niet gespecificeerd'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Validity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      v.a. Cohort
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCohort(product.cohort || '2024-25')}
                      </div>
                      <div className="text-sm text-gray-500">v.a. Cohort</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Version Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Tag className="h-5 w-5 mr-2" />
                      Versie Informatie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {product.version}
                      </div>
                      <div className="text-sm text-gray-500">Huidige versie</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Product niet gevonden.</p>
          </div>
        )}
      </div>
      
      {/* Purchase confirmation modal */}
      <Dialog open={showPurchaseModal} onOpenChange={open => {
        if (!open) {
          setShowPurchaseModal(false);
          setPurchaseModalError(null); // Reset error when modal closes
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bevestig aankoop</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {product && (
              <>
                Dit product kost <span className="font-semibold">{product.credits} credits</span>. Bevestig hieronder je aankoop.
              </>
            )}
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
            <Button variant="outline" onClick={() => setShowPurchaseModal(false)} disabled={purchasing}>
              Annuleren
            </Button>
            <Button
              variant="default"
              className="bg-examen-cyan text-white"
              onClick={handleConfirmPurchase}
              disabled={purchasing}
            >
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
} 