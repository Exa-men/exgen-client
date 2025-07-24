"use client"

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, CreditCard, Building, User, MapPin, FileText, Gift } from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../../lib/utils';
import { useCredits } from '../contexts/CreditContext';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  description: string;
  is_active: boolean;
}

interface CreditOrderForm {
  package_id: string;
  school_name: string;
  purchaser_name: string;
  purchase_reference: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  terms_accepted: boolean;
}

interface CreditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreditOrderModal: React.FC<CreditOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [step, setStep] = useState<'packages' | 'voucher' | 'form' | 'success'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [orderForm, setOrderForm] = useState<CreditOrderForm>({
    package_id: '',
    school_name: '',
    purchaser_name: '',
    purchase_reference: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'Netherlands',
    terms_accepted: false
  });

  // Voucher redemption state
  const { refreshCredits } = useCredits();
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isVoucherFocused, setIsVoucherFocused] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    creditsAdded?: number;
  } | null>(null);

  // Fetch credit packages
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/credits/packages', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages);
      } else {
        console.error('Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setOrderForm(prev => ({ ...prev, package_id: pkg.id }));
    setStep('form');
  };

  const handleFormChange = (field: keyof CreditOrderForm, value: string | boolean) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.terms_accepted) {
      alert('Je moet de algemene voorwaarden accepteren om door te gaan.');
      return;
    }

    setOrderLoading(true);
    try {
      const response = await fetch('/api/v1/credits/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(orderForm)
      });

      if (response.ok) {
        setStep('success');
        onSuccess?.();
      } else {
        const error = await response.json();
        alert(`Fout bij het plaatsen van de bestelling: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Er is een fout opgetreden bij het plaatsen van de bestelling.');
    } finally {
      setOrderLoading(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return `€${(priceCents / 100).toFixed(2)}`;
  };

  const handleClose = () => {
    setStep('packages');
    setSelectedPackage(null);
    setOrderForm({
      package_id: '',
      school_name: '',
      purchaser_name: '',
      purchase_reference: '',
      address_line1: '',
      address_line2: '',
      city: '',
      postal_code: '',
      country: 'Netherlands',
      terms_accepted: false
    });
    // Reset voucher state
    setVoucherCode('');
    setRedeemResult(null);
    setIsVoucherFocused(false);
    onClose();
  };

  const handleVoucherRedeem = async () => {
    if (!voucherCode.trim()) {
      setRedeemResult({
        success: false,
        message: 'Voer een voucher code in'
      });
      return;
    }

    setIsRedeeming(true);
    setRedeemResult(null);

    try {
      const response = await fetch('/api/v1/vouchers/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: voucherCode.trim().toUpperCase()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRedeemResult({
          success: true,
          message: data.message,
          creditsAdded: data.credits_added
        });
        setVoucherCode('');
        // Refresh user credits
        await refreshCredits();
        // Close modal after successful redemption
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setRedeemResult({
          success: false,
          message: data.detail || 'Er is een fout opgetreden bij het inwisselen van de voucher'
        });
      }
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      setRedeemResult({
        success: false,
        message: 'Er is een fout opgetreden bij het inwisselen van de voucher'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRedeeming) {
      handleVoucherRedeem();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'packages' && 'Kies een credit pakket'}
            {step === 'voucher' && 'Voucher inwisselen'}
            {step === 'form' && 'Vul bestellingsgegevens in'}
            {step === 'success' && 'Bestelling geplaatst!'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'packages' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-examen-cyan" />
                  <span className="ml-2">Pakketten laden...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedPackage?.id === pkg.id && "ring-2 ring-examen-cyan"
                      )}
                      onClick={() => handlePackageSelect(pkg)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          <Badge variant="secondary" className="text-sm">
                            {pkg.credits} credits
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm">{pkg.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-examen-cyan">
                          {formatPrice(pkg.price)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Of wissel een voucher in</span>
                </div>
              </div>

              {/* Voucher Option */}
              <Card
                className="cursor-pointer transition-all hover:shadow-md border-green-200 hover:border-green-300"
                onClick={() => setStep('voucher')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg text-green-700">Voucher inwisselen</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-sm bg-green-100 text-green-700">
                      Gratis
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">Heb je een voucher code? Wissel deze hier in voor credits.</p>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-green-600 font-medium">
                    Direct credits toevoegen
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'voucher' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voucher-code" className="text-sm font-medium text-gray-700">
                    Voucher Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="voucher-code"
                      type="text"
                      placeholder={isVoucherFocused ? "" : "Voer je voucher code in"}
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value.toUpperCase());
                        if (redeemResult) setRedeemResult(null);
                      }}
                      onFocus={() => setIsVoucherFocused(true)}
                      onBlur={() => setIsVoucherFocused(false)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 font-mono text-center tracking-wider"
                      disabled={isRedeeming}
                    />
                    <Button
                      onClick={handleVoucherRedeem}
                      disabled={isRedeeming || !voucherCode.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isRedeeming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Inwisselen'
                      )}
                    </Button>
                  </div>
                </div>

                {redeemResult && (
                  <div className={`p-3 rounded-lg border ${
                    redeemResult.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {redeemResult.success ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {redeemResult.message}
                      </span>
                    </div>
                    {redeemResult.success && redeemResult.creditsAdded && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium">{redeemResult.creditsAdded} credits</span> zijn toegevoegd aan je account.
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Vouchers kunnen maar één keer worden gebruikt</p>
                  <p>• Vouchers hebben een vervaldatum</p>
                  <p>• Credits worden direct toegevoegd aan je account</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('packages')}
                >
                  Terug naar opties
                </Button>
              </div>
            </div>
          )}

          {step === 'form' && selectedPackage && (
            <div className="space-y-6">
              {/* Selected Package Summary */}
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedPackage.name}</h3>
                      <p className="text-sm text-gray-600">{selectedPackage.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-examen-cyan">
                        {formatPrice(selectedPackage.price)}
                      </div>
                      <div className="text-sm text-gray-600">{selectedPackage.credits} credits</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="school_name" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      School naam *
                    </Label>
                    <Input
                      id="school_name"
                      value={orderForm.school_name}
                      onChange={(e) => handleFormChange('school_name', e.target.value)}
                      placeholder="Naam van de school"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaser_name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Naam koper *
                    </Label>
                    <Input
                      id="purchaser_name"
                      value={orderForm.purchaser_name}
                      onChange={(e) => handleFormChange('purchaser_name', e.target.value)}
                      placeholder="Naam van de koper"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_reference">
                    Referentienummer (optioneel)
                  </Label>
                  <Input
                    id="purchase_reference"
                    value={orderForm.purchase_reference}
                    onChange={(e) => handleFormChange('purchase_reference', e.target.value)}
                    placeholder="Bijv. PO-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line1" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adres regel 1 *
                  </Label>
                  <Input
                    id="address_line1"
                    value={orderForm.address_line1}
                    onChange={(e) => handleFormChange('address_line1', e.target.value)}
                    placeholder="Straatnaam en huisnummer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line2">
                    Adres regel 2 (optioneel)
                  </Label>
                  <Input
                    id="address_line2"
                    value={orderForm.address_line2}
                    onChange={(e) => handleFormChange('address_line2', e.target.value)}
                    placeholder="Aanvullende informatie"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">
                      Postcode *
                    </Label>
                    <Input
                      id="postal_code"
                      value={orderForm.postal_code}
                      onChange={(e) => handleFormChange('postal_code', e.target.value)}
                      placeholder="1234 AB"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Plaats *
                    </Label>
                    <Input
                      id="city"
                      value={orderForm.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      placeholder="Amsterdam"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">
                      Land
                    </Label>
                    <Input
                      id="country"
                      value={orderForm.country}
                      onChange={(e) => handleFormChange('country', e.target.value)}
                      placeholder="Nederland"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Checkbox
                    id="terms"
                    checked={orderForm.terms_accepted}
                    onCheckedChange={(checked) => 
                      handleFormChange('terms_accepted', checked as boolean)
                    }
                  />
                  <Label htmlFor="terms" className="text-sm">
                    Ik ga akkoord met de{' '}
                    <a href="/terms" target="_blank" className="text-examen-cyan hover:underline">
                      algemene voorwaarden
                    </a>
                    {' '}en{' '}
                    <a href="/privacy" target="_blank" className="text-examen-cyan hover:underline">
                      privacyverklaring
                    </a>
                  </Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('packages')}
                >
                  Terug naar pakketten
                </Button>
                <Button
                  onClick={handleSubmitOrder}
                  disabled={orderLoading || !orderForm.terms_accepted}
                  className="bg-examen-cyan hover:bg-examen-cyan-600"
                >
                  {orderLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bestelling plaatsen...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Bestelling plaatsen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bestelling succesvol geplaatst!
              </h3>
              <div className="space-y-3 text-gray-600 mb-6">
                <p>
                  Je pakket wordt momenteel voorbereid voor verzending.
                </p>
                <p>
                  We verifiëren je gegevens en verwerken je bestelling. Je hebt een bevestigingsmail ontvangen met alle details.
                </p>
                <p className="font-medium">
                  Levering van je credits kan binnen 2 werkdagen worden verwacht.
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="bg-examen-cyan hover:bg-examen-cyan-600"
              >
                Sluiten
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditOrderModal; 