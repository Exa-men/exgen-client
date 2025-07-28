"use client"

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, CreditCard, Building, User, MapPin, FileText, Gift, Pencil, Trash2, Plus, Check as CheckIcon, X as XIcon, AlertCircle } from 'lucide-react';
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
import { useCreditModal } from '../contexts/CreditModalContext';
import { useRole } from '../../hooks/use-role';
import { downloadInkoopvoorwaarden } from '../../lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

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
  comments?: string;
  terms_accepted: boolean;
}

interface FieldValidation {
  school_name: boolean;
  purchaser_name: boolean;
  purchase_reference: boolean;
  address_line1: boolean;
  city: boolean;
  postal_code: boolean;
}

const CreditOrderModal: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isOpen, closeModal } = useCreditModal();
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

  // Admin edit state
  const { isAdmin } = useRole();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CreditPackage>>({});
  const [creating, setCreating] = useState(false);
  const [createData, setCreateData] = useState<Partial<CreditPackage>>({ name: '', credits: 0, price: 0, description: '', is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);

  // Form validation state
  const [fieldValidation, setFieldValidation] = useState<FieldValidation>({
    school_name: false,
    purchaser_name: false,
    purchase_reference: false,
    address_line1: false,
    city: false,
    postal_code: false,
  });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

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
    
    // Validate field if it's a required field
    if (field in fieldValidation) {
      const isValid = typeof value === 'string' && value.trim().length > 0;
      setFieldValidation(prev => ({ ...prev, [field]: isValid }));
    }
  };

  const handleFieldBlur = (field: keyof CreditOrderForm) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const isFieldValid = (field: keyof FieldValidation): boolean => {
    return fieldValidation[field];
  };

  const isFieldTouched = (field: keyof FieldValidation): boolean => {
    return touchedFields.has(field);
  };

  const getFieldError = (field: keyof FieldValidation): string => {
    const fieldLabels = {
      school_name: 'onderwijsorganisatie',
      purchaser_name: 'contactpersoon',
      purchase_reference: 'factuurreferentie',
      address_line1: 'factuuradres',
      city: 'plaats',
      postal_code: 'postcode',
    };
    return `Vul de ${fieldLabels[field]} in`;
  };

  const isFormValid = (): boolean => {
    return Object.values(fieldValidation).every(valid => valid) && orderForm.terms_accepted;
  };

  const getInvalidFieldCount = (): number => {
    return Object.values(fieldValidation).filter(valid => !valid).length;
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.terms_accepted) {
      alert('Je moet de inkoopvoorwaarden accepteren om door te gaan.');
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
        await refreshCredits();
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
    closeModal();
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

  // Admin: handle edit
  const handleEdit = (pkg: CreditPackage) => {
    setEditingId(pkg.id);
    setEditData({ ...pkg });
    setCrudError(null);
  };
  const handleEditChange = (field: keyof CreditPackage, value: string | number | boolean) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };
  const handleEditSave = async () => {
    if (!editData.name || !editData.credits || !editData.price) {
      setCrudError('Vul alle verplichte velden in');
      return;
    }
    try {
      setCrudError(null);
      const response = await fetch(`/api/v1/admin/credits/packages/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        await fetchPackages();
        setEditingId(null);
      } else {
        const error = await response.json();
        setCrudError(error.detail || 'Fout bij opslaan');
      }
    } catch (e) {
      setCrudError('Fout bij opslaan');
    }
  };
  const handleEditCancel = () => {
    setEditingId(null);
    setCrudError(null);
  };
  // Admin: handle delete
  const handleDelete = (id: string) => {
    setDeleteId(id);
    setCrudError(null);
  };
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setCrudError(null);
    try {
      const response = await fetch(`/api/v1/admin/credits/packages/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      if (response.ok) {
        await fetchPackages();
        setDeleteId(null);
      } else {
        const error = await response.json();
        setCrudError(error.detail || 'Fout bij verwijderen');
      }
    } catch (e) {
      setCrudError('Fout bij verwijderen');
    } finally {
      setDeleteLoading(false);
    }
  };
  // Admin: handle create
  const handleCreate = () => {
    setCreating(true);
    setCreateData({ name: '', credits: 0, price: 0, description: '', is_active: true });
    setCrudError(null);
  };
  const handleCreateChange = (field: keyof CreditPackage, value: string | number | boolean) => {
    setCreateData((prev) => ({ ...prev, [field]: value }));
  };
  const handleCreateSave = async () => {
    if (!createData.name || !createData.credits || !createData.price) {
      setCrudError('Vul alle verplichte velden in');
      return;
    }
    try {
      setCrudError(null);
      const response = await fetch('/api/v1/admin/credits/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(createData)
      });
      if (response.ok) {
        await fetchPackages();
        setCreating(false);
      } else {
        const error = await response.json();
        setCrudError(error.detail || 'Fout bij aanmaken');
      }
    } catch (e) {
      setCrudError('Fout bij aanmaken');
    }
  };
  const handleCreateCancel = () => {
    setCreating(false);
    setCrudError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'packages' && 'Credits Bestellen'}
            {step === 'voucher' && 'Voucher Inwisselen'}
            {step === 'form' && 'Bestelling Plaatsen'}
            {step === 'success' && 'Bestelling Succesvol'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'packages' && (
            <div className="space-y-4">
              {crudError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {crudError}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-examen-cyan" />
                  <span className="ml-2">Pakketten laden...</span>
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    {packages.map((pkg) => (
                      <Card
                        key={pkg.id}
                        className={cn(
                          "relative transition-all hover:shadow-md",
                          selectedPackage?.id === pkg.id && "ring-2 ring-examen-cyan"
                        )}
                        onClick={() => !editingId && handlePackageSelect(pkg)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            {editingId === pkg.id ? (
                              <>
                                <Input
                                  value={editData.name as string}
                                  onChange={e => handleEditChange('name', e.target.value)}
                                  className="text-lg font-semibold"
                                  placeholder="Pakket naam"
                                />
                                <div className="flex gap-2">
                                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleEditSave(); }}>
                                    <CheckIcon className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleEditCancel(); }}>
                                    <XIcon className="h-4 w-4 text-gray-500" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {pkg.name}
                                  {isAdmin && (
                                    <>
                                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleEdit(pkg); }}>
                                        <Pencil className="h-4 w-4 text-gray-500" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleDelete(pkg.id); }}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                </CardTitle>
                                <Badge variant="secondary" className="text-sm">
                                  {pkg.credits} credits
                                </Badge>
                              </>
                            )}
                          </div>
                          {editingId === pkg.id ? (
                            <Textarea
                              value={editData.description as string}
                              onChange={e => handleEditChange('description', e.target.value)}
                              className="mt-2"
                              placeholder="Beschrijving"
                            />
                          ) : (
                            <p className="text-gray-600 text-sm">{pkg.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          {editingId === pkg.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                min={1}
                                value={editData.credits as number}
                                onChange={e => handleEditChange('credits', parseInt(e.target.value) || 0)}
                                className="w-24"
                                placeholder="Credits"
                              />
                              <Input
                                type="number"
                                min={1}
                                value={editData.price as number}
                                onChange={e => handleEditChange('price', parseInt(e.target.value) || 0)}
                                className="w-32"
                                placeholder="Prijs (centen)"
                              />
                              <span className="text-gray-500 text-sm">€{editData.price ? ((editData.price as number) / 100).toFixed(2) : '0.00'}</span>
                            </div>
                          ) : (
                            <div className="text-2xl font-bold text-examen-cyan">
                              {formatPrice(pkg.price)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {/* Admin: create new package */}
                    {isAdmin && !creating && (
                      <Button variant="outline" className="flex items-center gap-2 mt-2" onClick={handleCreate}>
                        <Plus className="h-4 w-4" />
                        Nieuw pakket
                      </Button>
                    )}
                    {/* Admin: create form */}
                    {isAdmin && creating && (
                      <Card className="border-dashed border-2 border-gray-300">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Input
                              value={createData.name as string}
                              onChange={e => handleCreateChange('name', e.target.value)}
                              className="text-lg font-semibold"
                              placeholder="Pakket naam"
                            />
                            <div className="flex gap-2">
                              <Button size="icon" variant="ghost" onClick={handleCreateSave}>
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleCreateCancel}>
                                <XIcon className="h-4 w-4 text-gray-500" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={createData.description as string}
                            onChange={e => handleCreateChange('description', e.target.value)}
                            className="mt-2"
                            placeholder="Beschrijving"
                          />
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min={1}
                              value={createData.credits as number}
                              onChange={e => handleCreateChange('credits', parseInt(e.target.value) || 0)}
                              className="w-24"
                              placeholder="Credits"
                            />
                            <Input
                              type="number"
                              min={1}
                              value={createData.price as number}
                              onChange={e => handleCreateChange('price', parseInt(e.target.value) || 0)}
                              className="w-32"
                              placeholder="Prijs (centen)"
                            />
                            <span className="text-gray-500 text-sm">€{createData.price ? ((createData.price as number) / 100).toFixed(2) : '0.00'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Voucher option - only shown after packages are loaded */}
                  <div className="border-t pt-4">
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
                </>
              )}
              {/* Delete confirmation modal */}
              {deleteId && (
                <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pakket verwijderen</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      Weet je zeker dat je dit pakket wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                        Annuleren
                      </Button>
                      <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
                        {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verwijderen'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
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
                    <Label htmlFor="school-name" className="text-sm font-medium text-gray-700">
                      Onderwijsorganisatie *
                    </Label>
                    <div className="relative">
                      <Building className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isFieldTouched('school_name') 
                          ? isFieldValid('school_name') ? 'text-green-500' : 'text-red-500'
                          : 'text-gray-400'
                      }`} />
                      <Input
                        id="school-name"
                        type="text"
                        value={orderForm.school_name}
                        onChange={(e) => handleFormChange('school_name', e.target.value)}
                        onBlur={() => handleFieldBlur('school_name')}
                        className={`pl-10 ${
                          isFieldTouched('school_name')
                            ? isFieldValid('school_name') 
                              ? 'border-green-500 focus:border-green-500' 
                              : 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        placeholder="Naam school of instelling"
                        required
                      />
                    </div>
                    {isFieldTouched('school_name') && !isFieldValid('school_name') && (
                      <p className="text-sm text-red-600">{getFieldError('school_name')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaser-name" className="text-sm font-medium text-gray-700">
                      Contactpersoon *
                    </Label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isFieldTouched('purchaser_name') 
                          ? isFieldValid('purchaser_name') ? 'text-green-500' : 'text-red-500'
                          : 'text-gray-400'
                      }`} />
                      <Input
                        id="purchaser-name"
                        type="text"
                        value={orderForm.purchaser_name}
                        onChange={(e) => handleFormChange('purchaser_name', e.target.value)}
                        onBlur={() => handleFieldBlur('purchaser_name')}
                        className={`pl-10 ${
                          isFieldTouched('purchaser_name')
                            ? isFieldValid('purchaser_name') 
                              ? 'border-green-500 focus:border-green-500' 
                              : 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        placeholder="Contactpersoon"
                        required
                      />
                    </div>
                    {isFieldTouched('purchaser_name') && !isFieldValid('purchaser_name') && (
                      <p className="text-sm text-red-600">{getFieldError('purchaser_name')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase-reference" className="text-sm font-medium text-gray-700">
                      Factuurreferentie/Kostenplaats *
                    </Label>
                    <div className="relative">
                      <FileText className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isFieldTouched('purchase_reference') 
                          ? isFieldValid('purchase_reference') ? 'text-green-500' : 'text-red-500'
                          : 'text-gray-400'
                      }`} />
                      <Input
                        id="purchase-reference"
                        type="text"
                        value={orderForm.purchase_reference}
                        onChange={(e) => handleFormChange('purchase_reference', e.target.value)}
                        onBlur={() => handleFieldBlur('purchase_reference')}
                        className={`pl-10 ${
                          isFieldTouched('purchase_reference')
                            ? isFieldValid('purchase_reference') 
                              ? 'border-green-500 focus:border-green-500' 
                              : 'border-red-500 focus:border-red-500'
                            : ''
                        }`}
                        placeholder="Factuurreferentie"
                        required
                      />
                    </div>
                    {isFieldTouched('purchase_reference') && !isFieldValid('purchase_reference') && (
                      <p className="text-sm text-red-600">{getFieldError('purchase_reference')}</p>
                    )}
                  </div>


                </div>

                <div className="space-y-2">
                  <Label htmlFor="address-line1" className="text-sm font-medium text-gray-700">
                    Factuuradres *
                  </Label>
                  <Input
                    id="address-line1"
                    type="text"
                    value={orderForm.address_line1}
                    onChange={(e) => handleFormChange('address_line1', e.target.value)}
                    onBlur={() => handleFieldBlur('address_line1')}
                    className={`${
                      isFieldTouched('address_line1')
                        ? isFieldValid('address_line1') 
                          ? 'border-green-500 focus:border-green-500' 
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    placeholder="Straatnaam en huisnummer"
                    required
                  />
                  {isFieldTouched('address_line1') && !isFieldValid('address_line1') && (
                    <p className="text-sm text-red-600">{getFieldError('address_line1')}</p>
                  )}
                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal-code" className="text-sm font-medium text-gray-700">
                      Postcode *
                    </Label>
                    <Input
                      id="postal-code"
                      type="text"
                      value={orderForm.postal_code}
                      onChange={(e) => handleFormChange('postal_code', e.target.value)}
                      onBlur={() => handleFieldBlur('postal_code')}
                      className={`${
                        isFieldTouched('postal_code')
                          ? isFieldValid('postal_code') 
                            ? 'border-green-500 focus:border-green-500' 
                            : 'border-red-500 focus:border-red-500'
                          : ''
                      }`}
                      placeholder="Postcode"
                      required
                    />
                    {isFieldTouched('postal_code') && !isFieldValid('postal_code') && (
                      <p className="text-sm text-red-600">{getFieldError('postal_code')}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      Stad *
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      value={orderForm.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      onBlur={() => handleFieldBlur('city')}
                      className={`${
                        isFieldTouched('city')
                          ? isFieldValid('city') 
                            ? 'border-green-500 focus:border-green-500' 
                            : 'border-red-500 focus:border-red-500'
                          : ''
                      }`}
                      placeholder="Stad"
                      required
                    />
                    {isFieldTouched('city') && !isFieldValid('city') && (
                      <p className="text-sm text-red-600">{getFieldError('city')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments" className="text-sm font-medium text-gray-700">
                    Opmerkingen
                  </Label>
                  <Textarea
                    id="comments"
                    value={orderForm.comments || ''}
                    onChange={(e) => handleFormChange('comments', e.target.value)}
                    placeholder="Optionele opmerkingen voor je bestelling"
                    className="min-h-[80px]"
                  />
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
                    <button
                      type="button"
                      onClick={downloadInkoopvoorwaarden}
                      className="text-examen-cyan hover:underline cursor-pointer"
                    >
                      inkoopvoorwaarden
                    </button>
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
                <div className="flex flex-col items-end space-y-2">
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={orderLoading || !isFormValid()}
                    className={`${
                      isFormValid() 
                        ? 'bg-examen-cyan hover:bg-examen-cyan-600' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {orderLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Bestelling plaatsen...
                      </>
                    ) : isFormValid() ? (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Bestelling plaatsen
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Vul alle verplichte velden in
                      </>
                    )}
                  </Button>
                </div>
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