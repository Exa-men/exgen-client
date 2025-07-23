"use client";

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  FileText, 
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Separator } from '../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';
import UnifiedHeader from '../../../components/UnifiedHeader';
import { useRole } from '../../../../hooks/use-role';

interface AssessmentCriteria {
  id: string;
  onderdeel: string;
  criteria: string;
  insufficient: string;
  sufficient: string;
  good: string;
  excellent?: string;
  outstanding?: string;
  exceptional?: string;
}

interface Version {
  id: string;
  version: string;
  releaseDate: string;
  assessmentCriteria: AssessmentCriteria[];
  documents: Document[];
  password: string;
  isLatest: boolean;
  isEnabled: boolean;
}

interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

interface ExamProduct {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  cohort: string;
  version: string;
  versions: Version[];
  cost: number;
  validFrom: string;
}

export default function EditExamPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();
  const { isAdmin, isLoading: roleLoading } = useRole();
  
  const [product, setProduct] = useState<ExamProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [showExamDetails, setShowExamDetails] = useState(false);
  const [editValues, setEditValues] = useState({
    code: '',
    title: '',
    description: '',
    credits: '',
    cohort: ''
  });
  
  // Version management
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showVersionDeleteConfirm, setShowVersionDeleteConfirm] = useState<string | null>(null);
  const [deletingVersion, setDeletingVersion] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Redirect if not signed in or not admin
  useEffect(() => {
    if (isLoaded && (!isSignedIn || (!roleLoading && !isAdmin))) {
      router.push('/catalogus');
    }
  }, [isLoaded, isSignedIn, isAdmin, roleLoading, router]);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      if (!isSignedIn || !productId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const token = await getToken();
        const response = await fetch(`/api/catalog/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch product: ${response.status}`);
        }

        const data = await response.json();
        setProduct(data.product);
        
        // Initialize edit values
        setEditValues({
          code: data.product.code,
          title: data.product.title,
          description: data.product.description,
          credits: data.product.credits?.toString() || '',
          cohort: data.product.cohort || ''
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
        // For development, use mock data
        const mockProduct: ExamProduct = {
          id: productId,
          code: 'EX001',
          title: 'Basis Examen Nederlands',
          description: 'Fundamentele Nederlandse taalvaardigheid voor MBO niveau 2',
          credits: 5,
          cohort: '2024-25',
          version: '2.1',
          cost: 25.00,
          validFrom: '2024-25',
          versions: [
            {
              id: 'v1',
              version: '2.1',
              releaseDate: '2024-01-15',
              isLatest: true,
              isEnabled: true,
              password: 'Examen2024!',
              assessmentCriteria: [
                {
                  id: 'ac1',
                  onderdeel: 'Onderdeel 1',
                  criteria: 'Verzamelde informatie (D1-K1: Verzamelt informatie, gegevens en content)',
                  insufficient: 'De verzamelde informatie is onvoldoende en/of sluit onvoldoende aan bij het gekozen onderwerp.',
                  sufficient: 'De verzamelde informatie is voldoende en passend bij het gekozen onderwerp.',
                  good: 'De prestatie van de kandidaat overtreft duidelijk de beschrijving van voldoende.'
                }
              ],
              documents: [
                {
                  id: 'doc1',
                  name: 'Beoordelingscriteria.pdf',
                  url: '/documents/criteria.pdf',
                  uploadedAt: '2024-01-15'
                }
              ]
            }
          ]
        };
        setProduct(mockProduct);
        setEditValues({
          code: mockProduct.code,
          title: mockProduct.title,
          description: mockProduct.description,
          credits: mockProduct.credits.toString(),
          cohort: mockProduct.cohort
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [isSignedIn, productId, getToken]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveAll = async () => {
    if (!product) return;
    
    try {
      setSaving(true);
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      // Update local state
      setProduct(prev => prev ? {
        ...prev,
        ...editValues,
        credits: parseInt(editValues.credits) || 0
      } : null);

      setIsEditing(false);
      toast({
        title: "Succesvol opgeslagen",
        description: "Alle wijzigingen zijn opgeslagen.",
      });
    } catch (err) {
      console.error('Error updating product:', err);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het opslaan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset edit values to current product values
    if (product) {
      setEditValues({
        code: product.code,
        title: product.title,
        description: product.description,
        credits: product.credits?.toString() || '',
        cohort: product.cohort || ''
      });
    }
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [versionStates, setVersionStates] = useState<Record<string, boolean>>({});

  const duplicateVersion = () => {
    if (!product) return;
    
    const latestVersion = product.versions.find(v => v.isLatest);
    if (!latestVersion) return;

    const suggestedVersion = (parseFloat(latestVersion.version) + 0.1).toFixed(1);
    setNewVersionNumber(suggestedVersion);
    setShowVersionDialog(true);
  };

  const handleCreateVersion = () => {
    if (!product || !newVersionNumber.trim()) return;
    
    const latestVersion = product.versions.find(v => v.isLatest);
    if (!latestVersion) return;

    const newVersion: Version = {
      id: `v${Date.now()}`,
      version: newVersionNumber.trim(),
      releaseDate: new Date().toISOString().split('T')[0],
      isLatest: true,
      isEnabled: true,
      password: generatePassword(),
      assessmentCriteria: [...latestVersion.assessmentCriteria],
      documents: [...latestVersion.documents]
    };

    // Update all versions to set isLatest to false
    const updatedVersions = product.versions.map(v => ({ ...v, isLatest: false }));
    
    setProduct(prev => prev ? {
      ...prev,
      versions: [newVersion, ...updatedVersions],
      version: newVersion.version
    } : null);

    setShowVersionDialog(false);
    setNewVersionNumber('');

    toast({
      title: "Nieuwe versie aangemaakt",
      description: `Versie ${newVersion.version} is succesvol aangemaakt.`,
    });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    toast({
      title: "Wachtwoord gekopieerd",
      description: "Het wachtwoord is naar het klembord gekopieerd.",
    });
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    
    try {
      setDeleting(true);
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      toast({
        title: "Product verwijderd",
        description: "Het examenproduct is succesvol verwijderd.",
      });
      
      router.push('/catalogus');
    } catch (err) {
      console.error('Error deleting product:', err);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!showVersionDeleteConfirm || !product) return;
    
    try {
      setDeletingVersion(true);
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}/versions/${showVersionDeleteConfirm}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete version');
      }

      // Update local state
      const updatedVersions = product.versions.filter(v => v.id !== showVersionDeleteConfirm);
      setProduct(prev => prev ? { ...prev, versions: updatedVersions } : null);

      toast({
        title: "Versie verwijderd",
        description: "De versie is succesvol verwijderd.",
      });
    } catch (err) {
      console.error('Error deleting version:', err);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de versie.",
        variant: "destructive",
      });
    } finally {
      setDeletingVersion(false);
      setShowVersionDeleteConfirm(null);
    }
  };

  const handleToggleVersionStatus = async (versionId: string, isEnabled: boolean) => {
    if (!product) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}/versions/${versionId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update version status');
      }

      // Update the main product state only on success
      setProduct(prev => prev ? {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId ? { ...v, isEnabled } : v
        )
      } : null);

      toast({
        title: isEnabled ? "Versie ingeschakeld" : "Versie uitgeschakeld",
        description: isEnabled 
          ? "De versie is nu beschikbaar voor download." 
          : "De versie is niet meer beschikbaar voor download.",
      });
    } catch (err) {
      console.error('Error updating version status:', err);
      
      // Revert the local checkbox state on error
      setVersionStates(prev => ({ ...prev, [versionId]: !isEnabled }));
      
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van de versie status.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan"></div>
              <p className="text-gray-600">Laden van examen...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600">Examen niet gevonden.</p>
            <Button onClick={() => router.push('/catalogus')} className="mt-4">
              Terug naar catalogus
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/catalogus')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
        </div>

        {/* Exam Information */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            {/* Code, Title, and Credits in header */}
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Code */}
              <div className="md:w-32 flex-shrink-0">
                <label className="text-sm font-medium text-gray-700">Code</label>
                {isEditing ? (
                  <Input
                    value={editValues.code}
                    onChange={(e) => setEditValues(prev => ({ ...prev, code: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold mt-1">{product.code}</p>
                )}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-gray-700">Titel</label>
                {isEditing ? (
                  <Input
                    value={editValues.title}
                    onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold mt-1 truncate">{product.title}</p>
                )}
              </div>

              {/* Credits */}
              <div className="md:w-24 flex-shrink-0">
                <label className="text-sm font-medium text-gray-700">Credits</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editValues.credits}
                    onChange={(e) => setEditValues(prev => ({ ...prev, credits: e.target.value }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold mt-1">{product.credits}</p>
                )}
              </div>
            </div>
            
            {/* Edit buttons */}
            {!isEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartEdit}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Opslaan
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuleren
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Details toggle - only show when not editing */}
            {!isEditing && (
              <div className="flex items-center justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExamDetails(!showExamDetails)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {showExamDetails ? 'Verberg details' : 'Toon details'}
                  {showExamDetails ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </Button>
              </div>
            )}

            {/* Additional details - hidden by default, always visible when editing */}
            {(isEditing || showExamDetails) && (
              <div className="space-y-4">
                {/* Description and Cohort in one row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Beschrijving</label>
                    {isEditing ? (
                      <Textarea
                        value={editValues.description}
                        onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                        rows={2}
                      />
                    ) : (
                      <p className="text-lg font-semibold mt-1">{product.description}</p>
                    )}
                  </div>

                  {/* Cohort */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cohort</label>
                    {isEditing ? (
                      <Input
                        value={editValues.cohort}
                        onChange={(e) => setEditValues(prev => ({ ...prev, cohort: e.target.value }))}
                        className="mt-1"
                        placeholder="2024-25"
                      />
                    ) : (
                      <p className="text-lg font-semibold mt-1">{product.cohort}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Versiebeheer</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={duplicateVersion}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Versie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.versions.map((version) => (
                <div key={version.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={versionStates[version.id] ?? version.isEnabled}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            setVersionStates(prev => ({ ...prev, [version.id]: newState }));
                            handleToggleVersionStatus(version.id, newState);
                          }}
                          className="w-4 h-4 text-examen-cyan bg-gray-100 border-gray-300 rounded focus:ring-examen-cyan focus:ring-2"
                        />
                        <div>
                          <h3 className="font-semibold">Versie {version.version}</h3>
                          <p className="text-sm text-gray-600">
                            Uitgegeven op {new Date(version.releaseDate).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                      </div>
                      {version.isLatest && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Nieuwste
                        </Badge>
                      )}
                      {!version.isEnabled && (
                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                          Uitgeschakeld
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowVersionDeleteConfirm(version.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Collapsible
                    open={expandedVersions.has(version.id)}
                    onOpenChange={() => toggleVersionExpanded(version.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-center cursor-pointer mt-3 pt-3 border-t">
                        <span className="text-sm text-gray-600">
                          {expandedVersions.has(version.id) ? 'Verberg details' : 'Toon details'}
                        </span>
                        {expandedVersions.has(version.id) ? (
                          <ChevronUp className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-4 space-y-6">
                      <Separator />
                      
                      {/* Assessment Criteria */}
                      <div>
                        <h4 className="font-medium mb-3">Beoordelingscriteria</h4>
                        <div className="space-y-4">
                          {version.assessmentCriteria.map((criteria, index) => (
                            <div key={criteria.id} className="border rounded-lg p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                <div className="lg:col-span-1">
                                  <label className="text-sm font-medium">Onderdeel</label>
                                  <Input
                                    value={criteria.onderdeel}
                                    onChange={(e) => {
                                      // Update criteria logic would go here
                                    }}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="lg:col-span-3">
                                  <label className="text-sm font-medium">Criteria</label>
                                  <Textarea
                                    value={criteria.criteria}
                                    onChange={(e) => {
                                      // Update criteria logic would go here
                                    }}
                                    className="mt-1"
                                    rows={2}
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                  <label className="text-sm font-medium text-red-600">Onvoldoende</label>
                                  <Textarea
                                    value={criteria.insufficient}
                                    onChange={(e) => {
                                      // Update criteria logic would go here
                                    }}
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-yellow-600">Voldoende</label>
                                  <Textarea
                                    value={criteria.sufficient}
                                    onChange={(e) => {
                                      // Update criteria logic would go here
                                    }}
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-green-600">Goed</label>
                                  <Textarea
                                    value={criteria.good}
                                    onChange={(e) => {
                                      // Update criteria logic would go here
                                    }}
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="font-medium mb-3">Documenten</h4>
                        <div className="space-y-2">
                          {version.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{doc.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Geüpload op {new Date(doc.uploadedAt).toLocaleDateString('nl-NL')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Bekijken
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" className="w-full">
                            <Upload className="h-4 w-4 mr-2" />
                            Document Toevoegen
                          </Button>
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <h4 className="font-medium mb-3">Excel Wachtwoord</h4>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="password"
                            value={version.password}
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPassword(version.password)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Kopiëren
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Regenerate password logic would go here
                            }}
                          >
                            Nieuw
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-300 rounded-lg bg-white">
              <div>
                <h3 className="font-semibold text-red-800">Examen Verwijderen</h3>
                <p className="text-sm text-red-700">
                  Dit verwijdert het hele examenproduct en alle versies permanent.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Examen Verwijderen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weet je het zeker?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Weet je zeker dat je dit examenproduct wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Delete Confirmation Modal */}
      <Dialog open={!!showVersionDeleteConfirm} onOpenChange={(open) => !open && setShowVersionDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Versie Verwijderen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Weet je zeker dat je deze versie wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDeleteConfirm(null)} disabled={deletingVersion}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteVersion}
              disabled={deletingVersion}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deletingVersion ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Version Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Versie Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Versienummer</label>
              <Input
                value={newVersionNumber}
                onChange={(e) => setNewVersionNumber(e.target.value)}
                placeholder="bijv. 2.1, 3.0, 1.5"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Voer het gewenste versienummer in. Het wordt voorgesteld op basis van de laatste versie.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={!newVersionNumber.trim()}
            >
              Versie Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 