"use client";

import { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@clerk/nextjs';

interface VerificationResponse {
  is_valid: boolean;
  product_code?: string;
  product_title?: string;
  version?: string;
  generated_at?: string;
  status: string;
}

export default function VerificatiePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApi();
  const [hash, setHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerification = async () => {
    if (!hash.trim()) {
      setError('Voer een verificatiecode in');
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await api.verifyHash({
        file_hash: hash.trim(),
        file_name: 'unknown', // Placeholder, actual file name would be needed
        file_size: 0, // Placeholder, actual file size would be needed
      });

      if (error) {
        throw new Error(error.detail || 'Failed to verify hash');
      }

      setResult(data);
      
    } catch (error) {
      console.error('Verification error:', error);
      setError(error instanceof Error ? error.message : 'Hash verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async () => {
    if (result) {
      try {
        await navigator.clipboard.writeText(result.status);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verificatie</h1>
          <p className="text-gray-600">Verificeer de authenticiteit van een exameninstrument</p>
        </div>

        {/* Search Bar */}
        <div className="mb-10">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-10 w-10" />
            <Input
              type="text"
              placeholder="Voer de verificatiecode in..."
              value={hash}
              onChange={(e) => setHash(e.target.value.toUpperCase())}
              className="pl-16 h-20 !text-3xl w-full shadow-lg border-2 border-examen-cyan focus:border-examen-cyan focus:ring-2 focus:ring-examen-cyan/30 transition-all"
              maxLength={16}
            />
          </div>
        </div>

        {/* Verify Button */}
        <div className="mb-8">
          <Button
            onClick={handleVerification}
            disabled={verifying || !hash.trim()}
            className="bg-examen-cyan hover:bg-examen-cyan-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
          >
            {verifying ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Verificeren...
              </>
            ) : (
              'Verificeer Document'
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {result && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Verificatie Resultaat
                </CardTitle>
                <div className="flex items-center gap-2">
                  {result.is_valid ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Geldig
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" />
                      Ongeldig
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="ml-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Gekopieerd
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Kopieer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-medium text-gray-900">
                    {result.status}
                  </p>
                </div>

                {result.is_valid && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.product_code && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Product Code</label>
                        <p className="text-lg font-semibold text-gray-900">{result.product_code}</p>
                      </div>
                    )}
                    {result.product_title && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Product Titel</label>
                        <p className="text-lg font-semibold text-gray-900">{result.product_title}</p>
                      </div>
                    )}
                    {result.version && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Versie</label>
                        <p className="text-lg font-semibold text-gray-900">{result.version}</p>
                      </div>
                    )}
                    {result.generated_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gegenereerd Op</label>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(result.generated_at)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoe werkt verificatie?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-600">
                <p>1. <strong>Kopieer de verificatiecode</strong> van het exameninstrument</p>
                <p>2. <strong>Plak de code</strong> in het zoekveld hierboven</p>
                <p>3. <strong>Klik op "Verificeer Document"</strong> om de authenticiteit te controleren</p>
                <p>4. <strong>Ontvang het resultaat</strong> met details over het document</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 