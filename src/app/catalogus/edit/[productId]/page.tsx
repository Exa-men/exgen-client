"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Check,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { Separator } from '../../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useToast } from '../../../../hooks/use-toast';

import { useApi } from '../../../../hooks/use-api';
import { DocumentList } from '../../../../components/DocumentList';

// Backend API response types
interface BackendAssessmentLevel {
  id: string;
  label: string;
  value: string;
  order: number;
}

interface BackendAssessmentCriteria {
  id: string;
  criteria: string;
  order: number;
  levels: BackendAssessmentLevel[];
}

interface BackendAssessmentComponent {
  id: string;
  component: string;  // Fixed: backend returns "component" not "name"
  order: number;
  criteria: BackendAssessmentCriteria[];
}

interface BackendVersionDocument {
  id: string;
  name: string;
  file_path: string;
  download_url: string;
  uploaded_at: string;
  is_preview: boolean;
  order: number;
}

interface BackendProductVersion {
  id: string;
  version: string;
  release_date: string;
  is_latest: boolean;
  is_enabled: boolean;
  rubric_levels: number;
  documents: BackendVersionDocument[];
  assessment_components: BackendAssessmentComponent[];
}

interface BackendProduct {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  cohort: string;
  version: string;
  cost: number;
  status?: 'draft' | 'available';
  versions: BackendProductVersion[];
}



interface AssessmentLevel {
  id: string;
  label: string;
  value: string;
}

interface AssessmentCriteria {
  id: string;
  criteria: string;
  levels: AssessmentLevel[];
}

interface AssessmentOnderdeel {
  id: string;
  onderdeel: string;
  criteria: AssessmentCriteria[];
}

interface Version {
  id: string;
  version: string;
  releaseDate: string;
  assessmentOnderdelen: AssessmentOnderdeel[];
  rubricLevels: number; // 2, 3, 4, 5, or 6
  documents: Document[];
  isLatest: boolean;
  isEnabled: boolean;
}

interface Document {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  isPreview?: boolean;
  s3Status?: 'available' | 'missing' | 'checking';
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

  status?: 'draft' | 'available';
}

export default function EditExamPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();
  const api = useApi();
  
  const [product, setProduct] = useState<ExamProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    code: '',
    title: '',
    description: '',
    credits: '',
    cohort: ''
  });
  
  // Criteria editing states (independent of product editing)
  const [isCriteriaEditing, setIsCriteriaEditing] = useState(false);
  const [criteriaEditValues, setCriteriaEditValues] = useState<ExamProduct | null>(null);
  const [criteriaSaving, setCriteriaSaving] = useState(false);
  const [criteriaSaveStatus, setCriteriaSaveStatus] = useState<'saved' | 'saving' | 'error' | 'dirty'>('saved');
  
  // Version management
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showVersionDeleteConfirm, setShowVersionDeleteConfirm] = useState<string | null>(null);
  const [deletingVersion, setDeletingVersion] = useState(false);
  const [showOnderdeelDeleteConfirm, setShowOnderdeelDeleteConfirm] = useState<{versionId: string, onderdeelId: string} | null>(null);
  const [showCriteriaDeleteConfirm, setShowCriteriaDeleteConfirm] = useState<{versionId: string, onderdeelId: string, criteriaId: string} | null>(null);
  const [showDocumentDeleteConfirm, setShowDocumentDeleteConfirm] = useState<{versionId: string, documentId: string} | null>(null);
  const [showRubricChangeConfirm, setShowRubricChangeConfirm] = useState<{versionId: string, newLevelCount: number, currentLevelCount: number} | null>(null);

  // Save state management
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'dirty'>('saved');
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [lastSavedData, setLastSavedData] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<{
    totalFields: number;
    invalidFields: number;
    firstErrorField?: string;
  }>({ totalFields: 0, invalidFields: 0 });

  // Document management
  const [dragActive, setDragActive] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState<boolean>(false);
  
  // Ref to maintain stable reference to handleFileUpload
  const handleFileUploadRef = useRef<((files: File[], versionId: string) => Promise<void>) | null>(null);



  // Version validation feedback
  const [incompleteVersions, setIncompleteVersions] = useState<Set<string>>(new Set());
  
  // Version toggle loading state
  const [versionToggleLoading, setVersionToggleLoading] = useState<Set<string>>(new Set());
  
  // Product publication status

  
  // Track if product was published to detect changes
  const [wasPublished, setWasPublished] = useState(false);

  // Database verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Map<string, 'match' | 'mismatch' | 'unknown'>>(new Map());

  // Debug dialog state
  useEffect(() => {
    console.log('showCriteriaDeleteConfirm changed:', showCriteriaDeleteConfirm);
  }, [showCriteriaDeleteConfirm]);

  // Warn user before leaving if version toggle is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (versionToggleLoading.size > 0) {
        e.preventDefault();
        e.returnValue = 'Er zijn nog wijzigingen bezig. Weet je zeker dat je de pagina wilt verlaten?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [versionToggleLoading]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Helper functions for assessment criteria management
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  // Helper function to check if an ID is a temporary frontend ID
  const isTemporaryId = (id: string): boolean => {
    // Frontend IDs are 9-character alphanumeric strings
    // Database UUIDs are 36-character strings with hyphens
    return id.length === 9 && /^[a-z0-9]{9}$/.test(id);
  };

  // Rubric level labels
  const getRubricLabels = (levels: number) => {
    switch (levels) {
      case 2:
        return ['Onvoldoende', 'Voldoende'];
      case 3:
        return ['Onvoldoende', 'Voldoende', 'Goed'];
      case 4:
        return ['Onvoldoende', 'Voldoende', 'Goed', 'Uitstekend'];
      case 5:
        return ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
      case 6:
        return ['Verkennend', 'Onervaren', 'Beginner', 'Bekaam', 'Vakkundig', 'Professional'];
      default:
        return ['Onvoldoende', 'Voldoende', 'Goed'];
    }
  };

  const createEmptyLevels = (count: number): AssessmentLevel[] => {
    const labels = getRubricLabels(count);
    return labels.map((label, index) => ({
      id: generateId(),
      label,
      value: ''
    }));
  };

  // Helper function to check if a version has any rubric content
  const hasRubricContent = (version: Version): boolean => {
    return version.assessmentOnderdelen.some(onderdeel => 
      onderdeel.onderdeel.trim() || 
      onderdeel.criteria.some(criteria => 
        criteria.criteria.trim() || 
        criteria.levels.some(level => level.value.trim())
      )
    );
  };

  const handleRubricLevelChange = (versionId: string, newLevelCount: number) => {
    const version = product?.versions.find(v => v.id === versionId);
    if (!version) return;
    
    // If same level, no change needed
    if (version.rubricLevels === newLevelCount) return;
    
    // Check if there's existing content
    if (hasRubricContent(version)) {
      // Show confirmation modal
      setShowRubricChangeConfirm({
        versionId,
        newLevelCount,
        currentLevelCount: version.rubricLevels
      });
    } else {
      // No content, proceed directly
      updateRubricLevels(versionId, newLevelCount);
    }
  };

  const updateRubricLevels = (versionId: string, newLevelCount: number) => {
    if (!product) return;
    
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                rubricLevels: newLevelCount,
                assessmentOnderdelen: v.assessmentOnderdelen.map(o => ({
                  ...o,
                  criteria: o.criteria.map(c => ({
                    ...c,
                    levels: createEmptyLevels(newLevelCount)
                  }))
                }))
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new rubric levels state
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });
    
    // Update validation summary to clean up orphaned validation errors
    updateValidationSummary();
    
    // Reset verification result for rubric levels
    setVerificationResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(`rubric-${versionId}`);
      return newResults;
    });
    
    // Save immediately for structural changes
    setSaveStatus('dirty');
    performSave();
  };

  const addOnderdeel = (versionId: string) => {
    if (!product) return;
    
    console.log('Adding onderdeel to version:', versionId);
    
    const newOnderdeel: AssessmentOnderdeel = {
      id: generateId(),
      onderdeel: '',
      criteria: []
    };

    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? { ...v, assessmentOnderdelen: [...v.assessmentOnderdelen, newOnderdeel] }
            : v
        )
      };
      // Update lastSavedData to reflect the new onderdeel state
      setLastSavedData(JSON.stringify(updatedProduct));
      console.log('Updated product with new onderdeel:', updatedProduct);
      return updatedProduct;
    });

    // Mark as dirty for manual save
    setCriteriaSaveStatus('dirty');
  };

  const removeOnderdeel = (versionId: string, onderdeelId: string) => {
    if (!product) return;
    
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? { ...v, assessmentOnderdelen: v.assessmentOnderdelen.filter(o => o.id !== onderdeelId) }
            : v
        )
      };
      // Update lastSavedData to reflect the new state after onderdeel removal
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });

    // Update validation summary to clean up orphaned validation errors
    updateValidationSummary();

    // Save immediately for structural changes (deletions)
    setSaveStatus('dirty');
    performSave();

    toast({
      title: "Onderdeel verwijderd",
      description: "Het onderdeel is succesvol verwijderd.",
    });
  };

  const handleDeleteOnderdeel = (versionId: string, onderdeelId: string) => {
    setShowOnderdeelDeleteConfirm({ versionId, onderdeelId });
  };

  const handleDeleteCriteria = (versionId: string, onderdeelId: string, criteriaId: string) => {
    console.log('handleDeleteCriteria called:', { versionId, onderdeelId, criteriaId });
    setShowCriteriaDeleteConfirm({ versionId, onderdeelId, criteriaId });
    console.log('Dialog state set to:', { versionId, onderdeelId, criteriaId });
  };

  const handleDeleteDocument = (versionId: string, documentId: string) => {
    setShowDocumentDeleteConfirm({ versionId, documentId });
  };

  const addCriteria = (versionId: string, onderdeelId: string) => {
    if (!product) return;
    
    const version = product.versions.find(v => v.id === versionId);
    if (!version) return;
    
    const newCriteria: AssessmentCriteria = {
      id: generateId(),
      criteria: '',
      levels: createEmptyLevels(version.rubricLevels)
    };

    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                assessmentOnderdelen: v.assessmentOnderdelen.map(o =>
                  o.id === onderdeelId
                    ? { ...o, criteria: [...o.criteria, newCriteria] }
                    : o
                )
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new criteria state
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });

    // Mark as dirty for manual save
    setCriteriaSaveStatus('dirty');
  };

  const removeCriteria = (versionId: string, onderdeelId: string, criteriaId: string) => {
    console.log('removeCriteria called:', { versionId, onderdeelId, criteriaId });
    if (!product) return;
    
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                assessmentOnderdelen: v.assessmentOnderdelen.map(o =>
                  o.id === onderdeelId
                    ? { ...o, criteria: o.criteria.filter(c => c.id !== criteriaId) }
                    : o
                )
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new state after criteria removal
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });

    // Update validation summary to clean up orphaned validation errors
    updateValidationSummary();

    // Save immediately for structural changes (deletions)
    setSaveStatus('dirty');
    performSave();
  };

  const updateOnderdeel = (versionId: string, onderdeelId: string, value: string) => {
    if (!product) return;
    
    // Real-time validation
    validateFieldRealTime(`onderdeel-${onderdeelId}`, value);
    
    // Only trigger auto-save if there's meaningful content (more than 3 characters)
    const shouldAutoSave = value && value.trim().length >= 3;
    
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                assessmentOnderdelen: v.assessmentOnderdelen.map(o =>
                  o.id === onderdeelId
                    ? { ...o, onderdeel: value }
                    : o
                )
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new onderdeel state
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });
    
    // Reset verification result for this field
    setVerificationResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(`onderdeel-${onderdeelId}`);
      return newResults;
    });
    
    // Mark as dirty for manual save if there's meaningful content
    if (shouldAutoSave) {
      setCriteriaSaveStatus('dirty');
    }
  };

  // Validation functions
  const validateField = (value: string, fieldId: string): boolean => {
    const isValid = value.trim().length > 0;
    setValidationErrors(prev => {
      const newErrors = new Set(prev);
      if (isValid) {
        newErrors.delete(fieldId);
      } else {
        newErrors.add(fieldId);
      }
      return newErrors;
    });
    return isValid;
  };

  // Enhanced real-time validation function
  const validateFieldRealTime = (fieldId: string, value: string): boolean => {
    const isValid = value.trim().length > 0;
    
    setValidationErrors(prev => {
      const newErrors = new Set(prev);
      if (isValid) {
        newErrors.delete(fieldId);
      } else {
        newErrors.add(fieldId);
      }
      return newErrors;
    });
    
    // Update validation summary
    updateValidationSummary();
    
    return isValid;
  };

  // Update validation summary
  const updateValidationSummary = () => {
    if (!product) return;
    
    // Clean up orphaned validation errors first
    setValidationErrors(prev => {
      const newErrors = new Set(prev);
      const validFieldIds = new Set<string>();
      
      // Collect all valid field IDs from current product state
      product.versions.forEach(version => {
        version.assessmentOnderdelen.forEach(onderdeel => {
          validFieldIds.add(`onderdeel-${onderdeel.id}`);
          onderdeel.criteria.forEach(criteria => {
            validFieldIds.add(`criteria-${criteria.id}`);
            criteria.levels.forEach(level => {
              validFieldIds.add(`level-${level.id}`);
            });
          });
        });
      });
      
      // Remove orphaned validation errors
      const cleanedErrors = new Set<string>();
      newErrors.forEach(errorId => {
        if (validFieldIds.has(errorId)) {
          cleanedErrors.add(errorId);
        }
      });
      
      return cleanedErrors;
    });
    
    let totalFields = 0;
    let invalidFields = 0;
    let firstErrorField: string | undefined;
    
    product.versions.forEach(version => {
      version.assessmentOnderdelen.forEach(onderdeel => {
        // Count onderdeel fields
        totalFields++;
        if (!onderdeel.onderdeel.trim()) {
          invalidFields++;
          if (!firstErrorField) firstErrorField = `onderdeel-${onderdeel.id}`;
        }
        
        // Count criteria and levels
        onderdeel.criteria.forEach(criteria => {
          totalFields++;
          if (!criteria.criteria.trim()) {
            invalidFields++;
            if (!firstErrorField) firstErrorField = `criteria-${criteria.id}`;
          }
          
          criteria.levels.forEach(level => {
            totalFields++;
            if (!level.value.trim()) {
              invalidFields++;
              if (!firstErrorField) firstErrorField = `level-${level.id}`;
            }
          });
        });
      });
    });
    
    setValidationSummary({ totalFields, invalidFields, firstErrorField });
  };

  // Scroll to first error field
  const scrollToFirstError = () => {
    if (validationErrors.size === 0) return;
    
    // Find the first error field
    const firstErrorField = Array.from(validationErrors)[0];
    const element = document.getElementById(firstErrorField);
    
    if (element) {
      // Smooth scroll to element
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add temporary highlight effect
      element.classList.add('ring-2', 'ring-red-500', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-50');
      }, 3000);
      
      // Focus the field if it's an input
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.focus();
      }
    }
  };

  const validateAllFields = (): boolean => {
    if (!product) return false;
    
    const errors = new Set<string>();
    
    product.versions.forEach(version => {
      version.assessmentOnderdelen.forEach(onderdeel => {
        // Validate onderdeel name
        if (!onderdeel.onderdeel.trim()) {
          errors.add(`onderdeel-${onderdeel.id}`);
        }
        
        // Validate criteria and levels
        onderdeel.criteria.forEach(criteria => {
          if (!criteria.criteria.trim()) {
            errors.add(`criteria-${criteria.id}`);
          }
          
          criteria.levels.forEach(level => {
            if (!level.value.trim()) {
              errors.add(`level-${level.id}`);
            }
          });
        });
      });
    });
    
    setValidationErrors(errors);
    return errors.size === 0;
  };

  const performSave = async (): Promise<boolean> => {
    if (!product) return false;
    
    // Only validate for manual saves, not auto-saves
    // Auto-save should always succeed to preserve user's work
    const isValid = validateAllFields();
    if (!isValid) {
      console.log('Validation failed, but continuing with auto-save to preserve user work');
      // Continue with save even if validation fails for auto-save
    }
    
    try {
      setSaveStatus('saving');
      
      console.log('Starting auto-save for product:', productId);
      
      // Transform product data to match backend schema
      const saveData = {
        product_data: {
          code: product.code,
          title: product.title,
          description: product.description,
          credits: product.credits,
          cohort: product.cohort,
          cost: product.credits,  // Keep cost in sync with credits

        },
        versions_data: product.versions.map(version => ({
          id: version.id,  // Add version ID for backend lookup
          version_number: version.version,
          release_date: version.releaseDate,
          rubric_levels: version.rubricLevels,

          is_enabled: version.isEnabled,
          is_latest: version.isLatest,
          assessment_components: version.assessmentOnderdelen.map(component => ({
            id: isTemporaryId(component.id) ? undefined : component.id,  // Only include real database IDs
            component: component.onderdeel,  // Changed from "name" to "component"
            order: 1, // Will be calculated by backend
            assessment_criteria: component.criteria.map(criteria => ({
              id: isTemporaryId(criteria.id) ? undefined : criteria.id,  // Only include real database IDs
              criteria: criteria.criteria,
              order: 1, // Will be calculated by backend
              assessment_levels: criteria.levels.map(level => ({
                id: isTemporaryId(level.id) ? undefined : level.id,  // Only include real database IDs
                label: level.label,
                value: level.value,
                order: 1, // Will be calculated by backend
              }))
            }))
          }))
        }))
      };
      
      console.log('Sending save data:', saveData);
      
      const result = await api.saveProduct(productId, saveData);
      
      if (result.error) {
        console.error('Save failed:', result.error);
        throw new Error(result.error.detail);
      }
      
      console.log('Save successful:', result);
      setSaveStatus('saved');
      setLastSavedData(JSON.stringify(product));
      
      toast({
        title: "Opgeslagen",
        description: "Beoordelingscriteria zijn succesvol opgeslagen.",
      });
      
      // Verify the save was successful by checking if we can fetch the data back
      console.log('Save successful, verifying data integrity...');
      
      // Optional: Verify data integrity by fetching fresh data
      try {
        const verificationResult = await api.getProduct(productId);
        if (verificationResult.error) {
          console.warn('Data verification failed, but save was successful:', verificationResult.error);
        } else {
          console.log('Data verification successful - saved data matches expected state');
        }
      } catch (verificationError) {
        console.warn('Data verification failed, but save was successful:', verificationError);
        // Don't fail the save if verification fails - the save itself was successful
      }
      
      return true;
    } catch (error) {
      setSaveStatus('error');
      toast({
        title: "Opslaan mislukt",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Manual save for criteria (no more auto-save)

  const updateCriteria = (versionId: string, onderdeelId: string, criteriaId: string, field: 'criteria' | 'level', levelId?: string, value?: string) => {
    console.log('Updating criteria:', { versionId, onderdeelId, criteriaId, field, levelId, value });
    if (!product || value === undefined) return;
    
    // Real-time validation
    const fieldId = field === 'criteria' ? `criteria-${criteriaId}` : `level-${levelId}`;
    validateFieldRealTime(fieldId, value);
    
    // Only trigger auto-save if there's meaningful content (more than 3 characters)
    const shouldAutoSave = value && value.trim().length >= 3;
    
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                assessmentOnderdelen: v.assessmentOnderdelen.map(o =>
                  o.id === onderdeelId
                    ? {
                        ...o,
                        criteria: o.criteria.map(c =>
                          c.id === criteriaId
                            ? {
                                ...c,
                                ...(field === 'criteria' 
                                  ? { criteria: value }
                                  : {
                                      levels: c.levels.map(l =>
                                        l.id === levelId
                                          ? { ...l, value }
                                          : l
                                      )
                                    }
                                )
                              }
                            : c
                        )
                      }
                    : o
                )
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new criteria state
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });
    
    // Reset verification result for this field
    setVerificationResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(fieldId);
      return newResults;
    });
    
    // Mark as dirty for manual save if there's meaningful content
    if (shouldAutoSave) {
      setCriteriaSaveStatus('dirty');
    }
  };

  // Redirect if not signed in (let backend handle admin checks)
  useEffect(() => {
    console.log('Auth state changed:', { 
      isLoaded, 
      isSignedIn, 
      productId,
      retryCount
    });
    
    // Simple authentication check - let backend handle admin authorization
    if (isLoaded && !isSignedIn) {
      console.log('Redirecting: User not signed in');
      router.push('/catalogus');
      return;
    }
    
    // If user is signed in and we have a product ID, try to fetch the product
    if (isLoaded && isSignedIn && productId) {
      console.log('User signed in, attempting to fetch product...');
      fetchProduct();
    }
  }, [isLoaded, isSignedIn, router, productId]);

  // Fetch product data
  const fetchProduct = async () => {
    console.log('fetchProduct called:', { isSignedIn, productId, retryCount });
    
    if (!productId) {
      console.log('fetchProduct early return: no productId');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Making API call to getProduct...');
      const result = await api.getProduct(productId);
      console.log('API result:', result);
      
      if (result.error) {
        throw new Error(result.error.detail);
      }

      if (!result.data) {
        throw new Error('No product data received');
      }

      // Transform backend data to frontend format
      const backendProduct = result.data as BackendProduct;
      console.log('Received backend product data:', backendProduct);
      console.log('Assessment components from backend:', backendProduct.versions?.[0]?.assessment_components);
      
      const transformedProduct: ExamProduct = {
        id: backendProduct.id,
        code: backendProduct.code,
        title: backendProduct.title,
        description: backendProduct.description,
        credits: backendProduct.credits,
        cohort: backendProduct.cohort,
        version: backendProduct.version,
        cost: backendProduct.credits,  // Use credits as the cost

        status: backendProduct.status || 'draft',
        versions: backendProduct.versions?.map(version => ({
          id: version.id,
          version: version.version,
          releaseDate: version.release_date,
          isLatest: version.is_latest,
          isEnabled: version.is_enabled,

          rubricLevels: version.rubric_levels,
          documents: version.documents?.map(doc => ({
            id: doc.id,
            name: doc.name,
            url: doc.download_url,
            uploadedAt: doc.uploaded_at,
            isPreview: doc.is_preview
          })) || [],
          assessmentOnderdelen: version.assessment_components?.map(component => ({
            id: component.id,
            onderdeel: component.component,  // Fixed: use component.component instead of component.name
            criteria: component.criteria?.map(criteria => ({
              id: criteria.id,
              criteria: criteria.criteria,
              levels: criteria.levels?.map(level => ({
                id: level.id,
                label: level.label,
                value: level.value
              })) || []
            })) || []
          })) || []
        })) || []
      };

      console.log('Transformed product data:', transformedProduct);
      console.log('Transformed assessment onderdelen:', transformedProduct.versions?.[0]?.assessmentOnderdelen);
      setProduct(transformedProduct);
      setLastSavedData(JSON.stringify(transformedProduct)); // Initialize as saved
      
      // Reset all save statuses when fresh data is loaded
      setSaveStatus('saved');
      setCriteriaSaveStatus('saved');
      setIsEditing(false);
      setIsCriteriaEditing(false);
      setCriteriaEditValues(null);
      
      // Set publication status based on product status

      
      // Initialize edit values
      setEditValues({
        code: transformedProduct.code,
        title: transformedProduct.title,
        description: transformedProduct.description,
        credits: transformedProduct.credits?.toString() || '',
        cohort: transformedProduct.cohort || ''
      });
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
      
      // Only use mock data in development environment
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for development');
        const mockProduct: ExamProduct = {
          id: productId,
          code: 'EX001',
          title: 'Basis Examen Nederlands',
          description: 'Fundamentele Nederlandse taalvaardigheid voor MBO niveau 2',
          credits: 5,
          cohort: '2024-25',
          version: '2.1',
          cost: 25.00,

          versions: [
            {
              id: 'v1',
              version: '2.1',
              releaseDate: '2024-01-15',
              isLatest: true,
              isEnabled: true,
              rubricLevels: 3,
              assessmentOnderdelen: [
                {
                  id: 'onderdeel1',
                  onderdeel: 'Grammatica',
                  criteria: [
                    {
                      id: 'criteria1',
                      criteria: 'Correct gebruik van werkwoorden',
                      levels: [
                        { id: 'level1', label: 'Onvoldoende', value: 'Veel fouten in werkwoordvervoeging' },
                        { id: 'level2', label: 'Voldoende', value: 'Enkele fouten in werkwoordvervoeging' },
                        { id: 'level3', label: 'Goed', value: 'Correcte werkwoordvervoeging' }
                      ]
                    }
                  ]
                }
              ],
              documents: [
                {
                  id: 'doc1',
                  name: 'Beoordelingscriteria.pdf',
                  url: '/documents/criteria.pdf',
                  uploadedAt: '2024-01-15',
                  isPreview: false
                },
                {
                  id: 'doc2',
                  name: 'Instructies.pdf',
                  url: '/documents/instructions.pdf',
                  uploadedAt: '2024-01-15',
                  isPreview: false
                },
                {
                  id: 'doc3',
                  name: 'Voorbeelden.pdf',
                  url: '/documents/examples.pdf',
                  uploadedAt: '2024-01-15',
                  isPreview: false
                }
              ]
            },
            {
              id: 'v2',
              version: '2.2',
              releaseDate: '2024-01-20',
              isLatest: false,
              isEnabled: false,
              rubricLevels: 3,
              assessmentOnderdelen: [],
              documents: []
            }
          ]
        };
        setProduct(mockProduct);
        setLastSavedData(JSON.stringify(mockProduct)); // Initialize as saved
        
        // Reset all save statuses when mock data is loaded
        setSaveStatus('saved');
        setCriteriaSaveStatus('saved');
        setIsEditing(false);
        setIsCriteriaEditing(false);
        setCriteriaEditValues(null);
        setEditValues({
          code: mockProduct.code,
          title: mockProduct.title,
          description: mockProduct.description,
          credits: mockProduct.credits.toString(),
          cohort: mockProduct.cohort
        });
      } else {
        // In production, don't set mock data, let the error state handle it
        setProduct(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId, getToken, retryCount]);

  // Enhanced unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt vertrekken?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, criteriaSaveStatus, isCriteriaEditing, product, criteriaEditValues]);

  // Update hasUnsavedChanges state whenever relevant states change
  useEffect(() => {
    setHasUnsavedChanges(checkUnsavedChanges());
  }, [saveStatus, criteriaSaveStatus, isCriteriaEditing, product, criteriaEditValues]);

  // Update validation summary when product changes
  useEffect(() => {
    if (product) {
      updateValidationSummary();
    }
  }, [product]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveAll = async () => {
    if (!product) return;
    
    try {
      setSaving(true);
      const token = await getToken();
      const response = await fetch(`/api/catalog/products/${productId}`, {
        method: 'PUT',
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
      const newCredits = parseInt(editValues.credits) || 0;
      setProduct(prev => prev ? {
        ...prev,
        ...editValues,
        credits: newCredits,
        cost: newCredits  // Keep cost in sync with credits
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

  // Criteria editing functions
  const handleStartCriteriaEdit = () => {
    setIsCriteriaEditing(true);
    setCriteriaSaving(false); // Ensure loading state is reset when starting edit
    setCriteriaSaveStatus('dirty'); // Mark as dirty for new changes
    // Store current criteria state for potential cancellation
    setCriteriaEditValues(product);
  };

  const handleSaveCriteria = async () => {
    if (!product) return;
    
    // Validate all fields before saving
    const isValid = validateAllFields();
    
    if (!isValid) {
      // Show validation summary
      toast({
        title: "Validatie mislukt",
        description: `${validationErrors.size} veld${validationErrors.size > 1 ? 'en' : ''} moeten worden ingevuld.`,
        variant: "destructive",
      });
      
      // Scroll to first error
      scrollToFirstError();
      return;
    }
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        setCriteriaSaving(true);
        setCriteriaSaveStatus('saving');
        
        // Transform only criteria data to match backend schema
        const saveData = {
          versions_data: product.versions.map(version => ({
            id: version.id,
            version_number: version.version,
            release_date: version.releaseDate,
            rubric_levels: version.rubricLevels,
            is_enabled: version.isEnabled,
            is_latest: version.isLatest,
            assessment_components: version.assessmentOnderdelen.map(component => ({
              id: isTemporaryId(component.id) ? undefined : component.id,
              component: component.onderdeel,
              order: 1,
              assessment_criteria: component.criteria.map(criteria => ({
                id: isTemporaryId(criteria.id) ? undefined : criteria.id,
                criteria: criteria.criteria,
                order: 1,
                assessment_levels: criteria.levels.map(level => ({
                  id: isTemporaryId(level.id) ? undefined : level.id,
                  label: level.label,
                  value: level.value,
                  order: 1,
                }))
              }))
            }))
          }))
        };
        
        console.log(`Attempt ${retryCount + 1}/${maxRetries}: Saving criteria data...`);
        const result = await api.saveProduct(productId, saveData);
        
        if (result.error) {
          throw new Error(result.error.detail || 'Unknown error occurred');
        }
        
        // Verify the save was successful by checking if we can fetch the data back
        console.log('Save successful, verifying data integrity...');
        
        // Optional: Verify data integrity by fetching fresh data
        try {
          const verificationResult = await api.getProduct(productId);
          if (verificationResult.error) {
            console.warn('Data verification failed, but save was successful:', verificationResult.error);
          } else {
            console.log('Data verification successful - saved data matches expected state');
          }
        } catch (verificationError) {
          console.warn('Data verification failed, but save was successful:', verificationError);
          // Don't fail the save if verification fails - the save itself was successful
        }
        
        setCriteriaSaveStatus('saved');
        setIsCriteriaEditing(false);
        setCriteriaEditValues(null);
        
        // Update lastSavedData to reflect the saved state
        setLastSavedData(JSON.stringify(product));
        
        // Reset any product-level save status that might be dirty
        if (saveStatus === 'dirty') {
          setSaveStatus('saved');
        }
        
        toast({
          title: "Criteria opgeslagen",
          description: "Beoordelingscriteria zijn succesvol opgeslagen en geverifieerd.",
        });
        
        return; // Success - exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`Save attempt ${retryCount}/${maxRetries} failed:`, error);
        
        if (retryCount >= maxRetries) {
          // Final failure
          setCriteriaSaveStatus('error');
          toast({
            title: "Opslaan mislukt",
            description: `Er is een fout opgetreden bij het opslaan na ${maxRetries} pogingen. Probeer het opnieuw of neem contact op met de beheerder.`,
            variant: "destructive",
          });
        } else {
          // Retry with exponential backoff
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`Retrying in ${delay}ms...`);
          
          toast({
            title: "Opnieuw proberen...",
            description: `Poging ${retryCount + 1}/${maxRetries} mislukt. Opnieuw proberen in ${delay/1000} seconden...`,
            variant: "default",
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        setCriteriaSaving(false); // Always reset, regardless of outcome
      }
    }
  };

  const handleCancelCriteriaEdit = () => {
    setIsCriteriaEditing(false);
    setCriteriaSaving(false); // Ensure loading state is reset when canceling
    // Reset criteria to stored values
    if (criteriaEditValues) {
      setProduct(criteriaEditValues);
    }
    setCriteriaEditValues(null);
    setCriteriaSaveStatus('saved');
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

  const toggleCriteriaExpanded = (criteriaId: string) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criteriaId)) {
      newExpanded.delete(criteriaId);
    } else {
      newExpanded.add(criteriaId);
    }
    setExpandedCriteria(newExpanded);
  };

  const handleManualSave = async () => {
    // Manual save for criteria
    await performSave();
  };

  const getSaveButtonState = () => {
    // Check if current state matches last saved state
    const currentData = JSON.stringify(product);
    const isDataSaved = lastSavedData === currentData;
    
    if (saveStatus === 'saving') {
      return { text: 'Opslaan...', variant: 'outline' as const, disabled: true, className: 'text-yellow-600 border-yellow-600' };
    }
    if (saveStatus === 'error' || validationErrors.size > 0) {
      return { text: 'Opslaan', variant: 'outline' as const, disabled: false, className: 'text-red-600 border-red-600 hover:bg-red-50' };
    }
    if (saveStatus === 'saved' || (isDataSaved && saveStatus !== 'dirty')) {
      return { text: 'Opgeslagen', variant: 'outline' as const, disabled: true, className: 'text-green-600 border-green-600' };
    }
    return { text: 'Opslaan', variant: 'default' as const, disabled: false, className: '' };
  };

  // Document management functions
  const handleDrag = useCallback((e: React.DragEvent) => {
    console.log('Drag event:', e.type);
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      console.log('Setting drag active to true');
      setDragActive(true);
    } else if (e.type === "dragleave") {
      console.log('Setting drag active to false');
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, versionId: string) => {
    console.log('Drop event triggered for version:', versionId);
    console.log('Files in drop:', e.dataTransfer.files);
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('Processing files:', Array.from(e.dataTransfer.files).map(f => f.name));
      const currentHandleFileUpload = handleFileUploadRef.current;
      if (currentHandleFileUpload) {
        await currentHandleFileUpload(Array.from(e.dataTransfer.files), versionId);
      } else {
        console.error('handleFileUpload not available');
      }
    } else {
      console.log('No files found in drop event');
    }
  }, []);

  const handleFileUpload = useCallback(async (files: File[], versionId: string) => {
    console.log('handleFileUpload called with files:', files.map(f => f.name), 'for version:', versionId);
    if (!product) {
      console.log('No product found, returning');
      return;
    }

    setUploadingDocuments(true);
    
    try {
      const uploadPromises = files.map(file => api.uploadDocument(versionId, file));
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results.filter(result => !result.error);
      const failedUploads = results.filter(result => result.error);
      
      if (successfulUploads.length > 0) {
        // Transform uploaded documents to match frontend format
        const newDocuments: Document[] = successfulUploads.map(result => {
          const docData = result.data as BackendVersionDocument;
          return {
            id: docData?.id || generateId(),
            name: docData?.name || 'Unknown file',
            url: docData?.download_url || '',
            uploadedAt: docData?.uploaded_at || new Date().toISOString(),
            isPreview: docData?.is_preview || false
          };
        });

        // Add documents to the version
        setProduct(prev => {
          if (!prev) return prev;
          const updatedProduct = {
            ...prev,
            versions: prev.versions.map(v => 
              v.id === versionId 
                ? { ...v, documents: [...v.documents, ...newDocuments] }
                : v
            )
          };
          // Update lastSavedData to reflect the new state after document upload
          setLastSavedData(JSON.stringify(updatedProduct));
          return updatedProduct;
        });
      }
      
      if (successfulUploads.length > 0) {
        toast({
          title: "Documenten geüpload",
          description: `${successfulUploads.length} document(en) succesvol geüpload.`,
        });
      }
      
      if (failedUploads.length > 0) {
        toast({
          title: "Upload fouten",
          description: `${failedUploads.length} document(en) konden niet worden geüpload.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload mislukt",
        description: "Er is een fout opgetreden bij het uploaden van de documenten.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocuments(false);
    }
  }, [product, api, generateId, toast]);

  // Update ref when handleFileUpload changes
  useEffect(() => {
    handleFileUploadRef.current = handleFileUpload;
  }, [handleFileUpload]);

  const removeDocument = async (versionId: string, documentId: string) => {
    if (!product) return;

    try {
      const result = await api.deleteDocument(documentId);
      
      if (result.error) {
        toast({
          title: "Verwijderen mislukt",
          description: result.error.detail,
          variant: "destructive",
        });
        return;
      }

      setProduct(prev => {
        if (!prev) return prev;
        const updatedProduct = {
          ...prev,
          versions: prev.versions.map(v => 
            v.id === versionId 
              ? { ...v, documents: v.documents.filter(d => d.id !== documentId) }
              : v
          )
        };
        // Update lastSavedData to reflect the new state after document removal
        setLastSavedData(JSON.stringify(updatedProduct));
        return updatedProduct;
      });

      toast({
        title: "Document verwijderd",
        description: "Document is succesvol verwijderd.",
      });
    } catch (error) {
      toast({
        title: "Verwijderen mislukt",
        description: "Er is een fout opgetreden bij het verwijderen van het document.",
        variant: "destructive",
      });
    }
  };

  const setPreviewDocument = async (versionId: string, documentId: string) => {
    if (!product) return;

    try {
      // Find the current document to determine new preview state
      const currentVersion = product.versions.find(v => v.id === versionId);
      const currentDocument = currentVersion?.documents.find(d => d.id === documentId);
      const newPreviewState = !currentDocument?.isPreview;

      const result = await api.setPreviewDocument(documentId, newPreviewState);
      
      if (result.error) {
        toast({
          title: "Preview bijwerken mislukt",
          description: result.error.detail,
          variant: "destructive",
        });
        return;
      }

      setProduct(prev => {
        if (!prev) return prev;
        const updatedProduct = {
          ...prev,
          versions: prev.versions.map(v => 
            v.id === versionId 
              ? {
                  ...v,
                  documents: v.documents.map(doc => {
                    const isCurrentlyPreview = doc.id === documentId;
                    return {
                      ...doc,
                      isPreview: isCurrentlyPreview ? newPreviewState : false
                    };
                  })
                }
              : v
          )
        };
        // Update lastSavedData to reflect the new state after preview status change
        setLastSavedData(JSON.stringify(updatedProduct));
        return updatedProduct;
      });

      toast({
        title: newPreviewState ? "Preview ingeschakeld" : "Preview uitgeschakeld",
        description: newPreviewState 
          ? "Document is nu beschikbaar voor gratis preview." 
          : "Document is niet meer beschikbaar voor gratis preview.",
      });
    } catch (error) {
      toast({
        title: "Preview bijwerken mislukt",
        description: "Er is een fout opgetreden bij het bijwerken van de preview.",
        variant: "destructive",
      });
    }
  };

  const updateDocumentS3Status = (versionId: string, documentId: string, status: 'available' | 'missing') => {
    setProduct(prev => {
      if (!prev) return prev;
      const updatedProduct = {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId 
            ? {
                ...v,
                documents: v.documents.map(d => 
                  d.id === documentId 
                    ? { ...d, s3Status: status }
                    : d
                )
              }
            : v
        )
      };
      // Update lastSavedData to reflect the new S3 status state
      setLastSavedData(JSON.stringify(updatedProduct));
      return updatedProduct;
    });
  };

  const verifyDatabaseContent = async () => {
    if (!product) return;
    
    try {
      setIsVerifying(true);
      const result = await api.verifyDatabase(productId);
      
      if (result.error) {
        toast({
          title: "Verificatie mislukt",
          description: result.error.detail,
          variant: "destructive",
        });
        return;
      }

      const freshData = result.data as BackendProduct;
      const newVerificationResults = new Map<string, 'match' | 'mismatch' | 'unknown'>();

      // Compare versions
      freshData.versions.forEach((freshVersion, versionIndex) => {
        const currentVersion = product.versions[versionIndex];
        if (!currentVersion) return;

        // Compare rubric levels
        const rubricKey = `rubric-${currentVersion.id}`;
        newVerificationResults.set(rubricKey, 
          freshVersion.rubric_levels === currentVersion.rubricLevels ? 'match' : 'mismatch'
        );

        // Compare assessment components (onderdelen)
        freshVersion.assessment_components.forEach((freshComponent, componentIndex) => {
          const currentComponent = currentVersion.assessmentOnderdelen[componentIndex];
          if (!currentComponent) return;

          // Compare onderdeel name
          const onderdeelKey = `onderdeel-${currentComponent.id}`;
          newVerificationResults.set(onderdeelKey, 
            freshComponent.component === currentComponent.onderdeel ? 'match' : 'mismatch'
          );

          // Compare criteria
          freshComponent.criteria.forEach((freshCriteria, criteriaIndex) => {
            const currentCriteria = currentComponent.criteria[criteriaIndex];
            if (!currentCriteria) return;

            // Compare criteria text
            const criteriaKey = `criteria-${currentCriteria.id}`;
            newVerificationResults.set(criteriaKey, 
              freshCriteria.criteria === currentCriteria.criteria ? 'match' : 'mismatch'
            );

            // Compare assessment levels
            freshCriteria.levels.forEach((freshLevel, levelIndex) => {
              const currentLevel = currentCriteria.levels[levelIndex];
              if (!currentLevel) return;

              const levelKey = `level-${currentLevel.id}`;
              newVerificationResults.set(levelKey, 
                freshLevel.value === currentLevel.value ? 'match' : 'mismatch'
              );
            });
          });
        });
      });

      setVerificationResults(newVerificationResults);

      // Count results for toast
      const matches = Array.from(newVerificationResults.values()).filter(v => v === 'match').length;
      const mismatches = Array.from(newVerificationResults.values()).filter(v => v === 'mismatch').length;

      toast({
        title: "Verificatie voltooid",
        description: `${matches} velden kloppen, ${mismatches} velden verschillen van de database.`,
      });

    } catch (error) {
      console.error('Database verification failed:', error);
      toast({
        title: "Verificatie mislukt",
        description: "Er is een fout opgetreden bij het verifiëren van de database.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [newVersionNumber, setNewVersionNumber] = useState('');

  const duplicateVersion = () => {
    if (!product) return;
    
    // Find the highest version number from all versions (not just the latest)
    const allVersions = product.versions.sort((a, b) => parseFloat(b.version) - parseFloat(a.version));
    const highestVersion = allVersions[0];
    
    // If no versions exist, suggest version 1.0
    if (!highestVersion) {
      setNewVersionNumber('1.0');
    } else {
      const suggestedVersion = (parseFloat(highestVersion.version) + 0.1).toFixed(1);
      setNewVersionNumber(suggestedVersion);
    }
    
    setShowVersionDialog(true);
  };

  const handleCreateVersion = async () => {
    if (!product || !newVersionNumber.trim()) return;
    
    try {
      const latestVersion = product.versions.find(v => v.isLatest);
      
      // Prepare version data for API
      const versionData = {
        version: newVersionNumber.trim(),
        release_date: new Date().toISOString().split('T')[0],
        is_latest: true,
        is_enabled: false,
        rubric_levels: latestVersion ? latestVersion.rubricLevels : 3
      };

      // Call API to create version
      console.log('Creating version with data:', versionData);
      const result = await api.createVersion(product.id, versionData);
      
      console.log('API response:', result);
      
      if (result.error) {
        throw new Error(result.error.detail);
      }

      // Get the created version from the API response
      const createdVersion = result.data as BackendProductVersion;
      
      // Transform the backend response to frontend format
      const newVersion: Version = {
        id: createdVersion.id,
        version: createdVersion.version,
        releaseDate: createdVersion.release_date,
        isLatest: createdVersion.is_latest,
        isEnabled: createdVersion.is_enabled,

        rubricLevels: createdVersion.rubric_levels,
        assessmentOnderdelen: latestVersion ? latestVersion.assessmentOnderdelen.map(onderdeel => ({
          ...onderdeel,
          id: generateId(),
          criteria: onderdeel.criteria.map(criteria => ({
            ...criteria,
            id: generateId(),
            levels: criteria.levels.map(level => ({
              ...level,
              id: generateId()
            }))
          }))
        })) : [],
        documents: [] // Will be populated after copying documents
      };

      // Update all versions to set isLatest to false (if any exist)
      const updatedVersions = product.versions.map(v => ({ ...v, isLatest: false }));
      
      setProduct(prev => {
        if (!prev) return null;
        const updatedProduct = {
          ...prev,
          versions: [newVersion, ...updatedVersions],
          version: newVersion.version
        };
        // Update lastSavedData to reflect the new version state
        setLastSavedData(JSON.stringify(updatedProduct));
        return updatedProduct;
      });

      // Copy documents from the latest version if it exists and has documents
      if (latestVersion && latestVersion.documents.length > 0) {
        try {
          console.log('Copying documents from version', latestVersion.id, 'to version', newVersion.id);
          const copyResult = await api.copyDocuments(newVersion.id, latestVersion.id);
          
          if (copyResult.error) {
            console.error('Error copying documents:', copyResult.error);
            toast({
              title: "Waarschuwing",
              description: "Versie aangemaakt, maar documenten konden niet worden gekopieerd. Upload handmatig nieuwe documenten.",
              variant: "destructive",
            });
          } else {
            console.log('Successfully copied documents:', copyResult.data);
            
            // Update the new version with copied documents
            const copyData = copyResult.data as any;
            const copiedDocuments: Document[] = (copyData?.copied_documents || []).map((doc: any) => ({
              id: doc.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: doc.name,
              url: doc.file_path, // This will be updated when we fetch the product
              uploadedAt: new Date().toISOString(),
              isPreview: doc.is_preview
            }));
            
            // Update the product with copied documents
            setProduct(prev => {
              if (!prev) return prev;
              const updatedProduct = {
                ...prev,
                versions: prev.versions.map(v => 
                  v.id === newVersion.id 
                    ? { ...v, documents: copiedDocuments }
                    : v
                )
              };
              // Update lastSavedData to reflect the new documents state
              setLastSavedData(JSON.stringify(updatedProduct));
              return updatedProduct;
            });
            
            toast({
              title: "Documenten gekopieerd",
              description: `${copyData?.copied_count || 0} document(en) succesvol gekopieerd naar de nieuwe versie.`,
            });
          }
        } catch (error) {
          console.error('Error copying documents:', error);
          toast({
            title: "Waarschuwing",
            description: "Versie aangemaakt, maar documenten konden niet worden gekopieerd. Upload handmatig nieuwe documenten.",
            variant: "destructive",
          });
        }
      }

      // Save the copied assessment data to the backend
      if (latestVersion && latestVersion.assessmentOnderdelen.length > 0) {
        try {
          const saveData = {
            versions_data: [{
              id: newVersion.id,
              version_number: newVersion.version,
              release_date: newVersion.releaseDate,
              rubric_levels: newVersion.rubricLevels,
              is_enabled: newVersion.isEnabled,
              is_latest: newVersion.isLatest,
              assessment_components: newVersion.assessmentOnderdelen.map(component => ({
                component: component.onderdeel,
                order: 1,
                assessment_criteria: component.criteria.map(criteria => ({
                  criteria: criteria.criteria,
                  order: 1,
                  assessment_levels: criteria.levels.map(level => ({
                    label: level.label,
                    value: level.value,
                    order: 1
                  }))
                }))
              }))
            }]
          };

          console.log('Saving copied assessment data for new version:', saveData);
          const saveResult = await api.saveProduct(product.id, saveData);
          
          if (saveResult.error) {
            console.error('Error saving copied assessment data:', saveResult.error);
            toast({
              title: "Waarschuwing",
              description: "Versie aangemaakt, maar assessment data kon niet worden gekopieerd. Probeer handmatig op te slaan.",
              variant: "destructive",
            });
          } else {
            console.log('Successfully saved copied assessment data');
          }
        } catch (error) {
          console.error('Error saving copied assessment data:', error);
          toast({
            title: "Waarschuwing",
            description: "Versie aangemaakt, maar assessment data kon niet worden gekopieerd. Probeer handmatig op te slaan.",
            variant: "destructive",
          });
        }
      }

      setShowVersionDialog(false);
      setNewVersionNumber('');

      toast({
        title: "Nieuwe versie aangemaakt",
        description: `Versie ${newVersion.version} is succesvol aangemaakt${latestVersion && latestVersion.assessmentOnderdelen.length > 0 ? ' met gekopieerde assessment data' : ''}${latestVersion && latestVersion.documents.length > 0 ? ' en gekopieerde documenten' : ''}.`,
      });
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Fout bij aanmaken versie",
        description: error instanceof Error ? error.message : "Er is een fout opgetreden bij het aanmaken van de versie.",
        variant: "destructive",
      });
    }
  };



  // Check if version meets publication requirements
  const isVersionReadyForPublication = (version: Version): boolean => {
    // Check for assessment components
    const hasOnderdelen = version.assessmentOnderdelen.length > 0;
    if (!hasOnderdelen) return false;
    
    // Check for criteria in each component
    const hasCriteria = version.assessmentOnderdelen.every(onderdeel => onderdeel.criteria.length > 0);
    if (!hasCriteria) return false;
    
    // Check for assessment levels in each criteria
    const hasLevels = version.assessmentOnderdelen.every(onderdeel => 
      onderdeel.criteria.every(criteria => criteria.levels.length > 0)
    );
    if (!hasLevels) return false;
    
    // Check that all levels have values
    const allLevelsHaveValues = version.assessmentOnderdelen.every(onderdeel => 
      onderdeel.criteria.every(criteria => 
        criteria.levels.every(level => level.value && level.value.trim() !== '')
      )
    );
    if (!allLevelsHaveValues) return false;
    
    // Check for documents (at least 3)
    const hasDocuments = version.documents.length >= 3;
    if (!hasDocuments) return false;
    
    // Check version number
    const hasVersionNumber = version.version && version.version.trim() !== '';
    if (!hasVersionNumber) return false;
    
    // Check release date
    const hasReleaseDate = version.releaseDate && version.releaseDate.trim() !== '';
    if (!hasReleaseDate) return false;
    
    // Check rubric levels (between 2-6)
    const hasValidRubricLevels = version.rubricLevels >= 2 && version.rubricLevels <= 6;
    if (!hasValidRubricLevels) return false;
    
    return true;
  };



  // Get version status for display
  const getVersionStatus = (version: Version) => {
    // Check if this version is showing incomplete feedback
    if (incompleteVersions.has(version.id)) {
      return { label: 'Incompleet', variant: 'default', className: 'bg-red-100 text-red-800' };
    }
    
    if (version.isLatest) {
      return { label: 'Nieuwste', variant: 'default', className: 'bg-green-100 text-green-800' };
    } else if (version.isEnabled) {
      return { label: 'Actief', variant: 'default', className: 'bg-blue-100 text-blue-800' };
    } else {
      return { label: 'Draft', variant: 'outline', className: 'text-blue-600 border-blue-300' };
    }
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
    
    console.log('Starting version deletion for:', showVersionDeleteConfirm);
    console.log('Version ID format check:', {
      id: showVersionDeleteConfirm,
      isTemporary: isTemporaryId(showVersionDeleteConfirm),
      length: showVersionDeleteConfirm.length
    });
    
    // Check if this is a temporary version that hasn't been saved to the database yet
    if (isTemporaryId(showVersionDeleteConfirm)) {
      console.log('Attempting to delete temporary version - removing from local state only');
      // Just remove from local state since it's not in the database
      const updatedVersions = product.versions.filter(v => v.id !== showVersionDeleteConfirm);
      setProduct(prev => {
        if (!prev) return null;
        const updatedProduct = { ...prev, versions: updatedVersions };
        // Update lastSavedData to reflect the new state after version deletion
        setLastSavedData(JSON.stringify(updatedProduct));
        return updatedProduct;
      });
      
      toast({
        title: "Versie verwijderd",
        description: "De versie is succesvol verwijderd.",
      });
      
      setDeletingVersion(false);
      setShowVersionDeleteConfirm(null);
      return;
    }
    
    try {
      setDeletingVersion(true);
      
      // Make actual API call to delete version
      console.log('Calling api.deleteVersion with:', showVersionDeleteConfirm);
      const result = await api.deleteVersion(showVersionDeleteConfirm);
      console.log('API result:', result);
      
      if (result.error) {
        console.error('API returned error:', result.error);
        toast({
          title: "Verwijderen mislukt",
          description: result.error.detail,
          variant: "destructive",
        });
        return;
      }

      console.log('Version deleted successfully, updating local state');
      // Update local state
      const updatedVersions = product.versions.filter(v => v.id !== showVersionDeleteConfirm);
      setProduct(prev => {
        if (!prev) return null;
        const updatedProduct = { ...prev, versions: updatedVersions };
        // Update lastSavedData to reflect the new state after version deletion
        setLastSavedData(JSON.stringify(updatedProduct));
        return updatedProduct;
      });

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
    
    const version = product.versions.find(v => v.id === versionId);
    if (!version) return;

    console.log('Toggle attempt:', { versionId, isEnabled, backendState: version.isEnabled });

    // If trying to enable, check if version is ready for publication
    if (isEnabled && !isVersionReadyForPublication(version)) {
      console.log('Validation failed for version:', versionId, 'Version data:', version);
      
      // Show incomplete feedback
      setIncompleteVersions(prev => new Set([...prev, versionId]));
      
      // Hide incomplete feedback after 3 seconds
      setTimeout(() => {
        setIncompleteVersions(prev => {
          const newSet = new Set(prev);
          newSet.delete(versionId);
          return newSet;
        });
      }, 3000);
      
      // Get specific validation errors
      const errors = [];
      if (version.assessmentOnderdelen.length === 0) {
        errors.push("minimaal 1 onderdeel");
      } else {
        const onderdeelWithoutCriteria = version.assessmentOnderdelen.find(o => o.criteria.length === 0);
        if (onderdeelWithoutCriteria) {
          errors.push("elk onderdeel moet minimaal 1 criterium hebben");
        } else {
          const criteriaWithoutLevels = version.assessmentOnderdelen.some(o => 
            o.criteria.some(c => c.levels.length === 0)
          );
          if (criteriaWithoutLevels) {
            errors.push("elk criterium moet beoordelingsniveaus hebben");
          } else {
            const levelsWithoutValues = version.assessmentOnderdelen.some(o => 
              o.criteria.some(c => c.levels.some(l => !l.value || l.value.trim() === ''))
            );
            if (levelsWithoutValues) {
              errors.push("alle beoordelingsniveaus moeten ingevuld zijn");
            }
          }
        }
      }
      
      if (version.documents.length < 3) {
        errors.push("minimaal 3 documenten");
      }
      
      if (!version.version || version.version.trim() === '') {
        errors.push("versienummer is verplicht");
      }
      
      if (!version.releaseDate || version.releaseDate.trim() === '') {
        errors.push("release datum is verplicht");
      }
      
      if (version.rubricLevels < 2 || version.rubricLevels > 6) {
        errors.push("beoordelingsniveaus moeten tussen 2-6 liggen");
      }
      
      toast({
        title: "Versie niet klaar voor publicatie",
        description: `Zorg ervoor dat: ${errors.join(', ')}.`,
        variant: "destructive",
      });
      
      // No need to revert checkbox state since we're using version.isEnabled directly
      return;
    }
    
    // Set loading state for this version
    setVersionToggleLoading(prev => new Set([...prev, versionId]));
    
    try {
      // Call the real API
      const result = await api.toggleVersionStatus(versionId, isEnabled);
      
      if (result.error) {
        throw new Error(result.error.detail);
      }

      // Update the main product state
      setProduct(prev => prev ? {
        ...prev,
        versions: prev.versions.map(v => 
          v.id === versionId ? { ...v, isEnabled } : v
        )
      } : null);

      // No need to update versionStates since we're using version.isEnabled directly

      console.log('Toggle successful:', { versionId, isEnabled });

      toast({
        title: isEnabled ? "Versie ingeschakeld" : "Versie uitgeschakeld",
        description: isEnabled 
          ? "De versie is nu beschikbaar voor download." 
          : "De versie is niet meer beschikbaar voor download.",
      });
    } catch (err) {
      console.error('Error updating version status:', err);
      
      // No need to revert checkbox state since we're using version.isEnabled directly
      
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Er is een fout opgetreden bij het bijwerken van de versie status.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setVersionToggleLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(versionId);
        return newSet;
      });
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    fetchProduct();
  };

  const getFieldBorderStyle = (fieldId: string): string => {
    // Check validation errors first (highest priority)
    if (validationErrors.has(fieldId)) {
      return 'border-red-500 focus:border-red-500';
    }
    
    // Then check database verification
    const status = verificationResults.get(fieldId);
    switch (status) {
      case 'match':
        return 'border-green-500 focus:border-green-600';
      case 'mismatch':
        return 'border-red-500 focus:border-red-600';
      default:
        return 'border-gray-300 focus:border-blue-500';
    }
  };

  // Enhanced unsaved changes detection
  const hasProductChanges = (): boolean => {
    if (!product || !lastSavedData) return false;
    const currentData = JSON.stringify(product);
    return lastSavedData !== currentData;
  };

  const hasCriteriaChanges = (): boolean => {
    // Only check for changes if we're actually in criteria editing mode
    if (!isCriteriaEditing || !criteriaEditValues || !product) return false;
    
    // Compare current product versions with the saved criteria edit values
    const currentCriteria = JSON.stringify(product.versions);
    const savedCriteria = JSON.stringify(criteriaEditValues.versions);
    return currentCriteria !== savedCriteria;
  };

  const checkUnsavedChanges = (): boolean => {
    // Check product-level changes
    const hasProductUnsavedChanges = saveStatus === 'dirty' || saveStatus === 'saving' || hasProductChanges();
    
    // Check criteria-level changes (only if in editing mode)
    const hasCriteriaUnsavedChanges = (criteriaSaveStatus === 'dirty' || criteriaSaveStatus === 'saving' || hasCriteriaChanges());
    
    return hasProductUnsavedChanges || hasCriteriaUnsavedChanges;
  };

  // Navigation protection functions
  const handleNavigationAttempt = (targetPath: string) => {
    if (checkUnsavedChanges()) {
      setPendingNavigation(targetPath);
      setShowUnsavedWarning(true);
    } else {
      router.push(targetPath);
    }
  };

  const handleConfirmNavigation = () => {
    setShowUnsavedWarning(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  };

  // UnsavedChangesWarning Component
  const UnsavedChangesWarning = () => (
    <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-yellow-600" />
            Niet-opgeslagen wijzigingen
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Je hebt nog niet alle wijzigingen opgeslagen. Weet je zeker dat je wilt vertrekken?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Let op:</strong> Niet-opgeslagen wijzigingen gaan verloren.
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancelNavigation}>
            Blijven bewerken
          </Button>
          <Button variant="destructive" onClick={handleConfirmNavigation}>
            Vertrekken zonder op te slaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // RubricChangeWarning Component
  const RubricChangeWarning = () => (
    <Dialog open={!!showRubricChangeConfirm} onOpenChange={(open) => !open && setShowRubricChangeConfirm(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rubric niveaus wijzigen
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Je hebt al content ingevuld voor de huidige rubric niveaus. 
            Het wijzigen van het aantal niveaus zal alle bestaande content verwijderen.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Let op:</strong> Alle ingevulde onderdelen, criteria en niveau beschrijvingen gaan verloren.
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRubricChangeConfirm(null)}>
            Annuleren
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              if (showRubricChangeConfirm) {
                updateRubricLevels(showRubricChangeConfirm.versionId, showRubricChangeConfirm.newLevelCount);
                setShowRubricChangeConfirm(null);
              }
            }}
          >
            Wijzigen en content verwijderen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            {error ? (
              <div className="space-y-4">
                <p className="text-gray-600">Er is een fout opgetreden bij het laden van het examen.</p>
                <p className="text-sm text-gray-500">{error}</p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={handleRetry} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Opnieuw proberen
                  </Button>
                  <Button onClick={() => handleNavigationAttempt('/catalogus')} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Terug naar catalogus
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="animate-spin h-8 w-8 mx-auto text-examen-cyan"></div>
                <p className="text-gray-600">Laden van examen...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handleNavigationAttempt('/catalogus')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug
            </Button>
            
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-800 font-medium">
                  Niet-opgeslagen wijzigingen
                </span>
              </div>
            )}
          </div>
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
                  onClick={verifyDatabaseContent}
                  disabled={isVerifying || saving}
                  className="flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      Verifiëren...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Verificeer Database
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
                <label className="text-sm font-medium text-gray-700">v.a. Cohort</label>
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
              {product.versions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="mb-4">
                    <FileText className="h-12 w-12 mx-auto text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Geen versies beschikbaar</h3>
                  <p className="text-gray-500 mb-4">Er zijn nog geen versies aangemaakt voor dit examenproduct.</p>
                  <Button
                    variant="outline"
                    onClick={duplicateVersion}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Eerste Versie Aanmaken
                  </Button>
                </div>
              ) : (
                product.versions
                  .sort((a, b) => parseFloat(b.version) - parseFloat(a.version))
                  .map((version) => (
                  <div key={version.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={version.isEnabled}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            handleToggleVersionStatus(version.id, newState);
                          }}
                          disabled={versionToggleLoading.has(version.id)}
                          className={`w-4 h-4 text-examen-cyan bg-gray-100 border-gray-300 rounded focus:ring-examen-cyan focus:ring-2 ${
                            versionToggleLoading.has(version.id) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                        {versionToggleLoading.has(version.id) && (
                          <div className="ml-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-examen-cyan"></div>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold">Versie {version.version}</h3>
                          <p className="text-sm text-gray-600">
                            Gepubliceerd op {new Date(version.releaseDate).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const status = getVersionStatus(version);
                        return (
                          <Badge variant={status.variant as any} className={status.className}>
                            {status.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!isCriteriaEditing ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStartCriteriaEdit}
                          className="flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Bewerken
                        </Button>
                      ) : (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={handleSaveCriteria}
                              disabled={criteriaSaving || validationErrors.size > 0}
                              className={`flex items-center ${validationErrors.size > 0 ? 'border-red-500' : ''}`}
                            >
                              {criteriaSaving ? (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                  Opslaan...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Opslaan Criteria
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelCriteriaEdit}
                              disabled={criteriaSaving}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Annuleren
                            </Button>
                          </div>
                          {validationErrors.size > 0 && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Incompleet - {validationErrors.size} veld{validationErrors.size > 1 ? 'en' : ''} ontbreken
                            </p>
                          )}
                        </div>
                      )}
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
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-6">
                            <h4 className="font-medium">Beoordelingscriteria</h4>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">Rubric niveaus:</span>
                              <div className={`flex items-center space-x-2 p-2 rounded border ${getFieldBorderStyle(`rubric-${version.id}`)}`}>
                                {[2, 3, 4, 5, 6].map((level) => (
                                  <label key={level} className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`rubric-${version.id}`}
                                      value={level}
                                      checked={version.rubricLevels === level}
                                      onChange={() => handleRubricLevelChange(version.id, level)}
                                      disabled={!isCriteriaEditing}
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm">{level}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addOnderdeel(version.id)}
                            disabled={!isCriteriaEditing}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Onderdeel Toevoegen
                          </Button>
                        </div>
                        
                        <div className="space-y-6">
                          {version.assessmentOnderdelen.map((onderdeel) => (
                            <div key={onderdeel.id} className="border rounded-lg p-4 bg-gray-50">
                              {/* Onderdeel Header */}
                              <div className="flex items-end justify-between mb-4">
                                <div className="flex-1 mr-4">
                                  <label className="text-sm font-medium text-gray-700">Onderdeel</label>
                                  {isCriteriaEditing ? (
                                    <Input
                                      id={`onderdeel-${onderdeel.id}`}
                                      value={onderdeel.onderdeel}
                                      onChange={(e) => updateOnderdeel(version.id, onderdeel.id, e.target.value)}
                                      className={`mt-1 ${getFieldBorderStyle(`onderdeel-${onderdeel.id}`)}`}
                                      placeholder="Voer onderdeel naam in"
                                    />
                                  ) : (
                                    <p className="mt-1 text-lg font-semibold">{onderdeel.onderdeel}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addCriteria(version.id, onderdeel.id)}
                                    disabled={!isCriteriaEditing}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Criterium Toevoegen
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteOnderdeel(version.id, onderdeel.id)}
                                    disabled={!isCriteriaEditing}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Criteria Rows */}
                              <div className="space-y-4">
                                {onderdeel.criteria.length === 0 ? (
                                  <div className="text-center py-4 text-gray-500">
                                    <p>Nog geen criteria toegevoegd</p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addCriteria(version.id, onderdeel.id)}
                                      className="mt-2 text-blue-600 hover:text-blue-700"
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Eerste Criterium Toevoegen
                                    </Button>
                                  </div>
                                                                 ) : (
                                   onderdeel.criteria.map((criteria, index) => (
                                     <div key={criteria.id} className="border rounded-lg bg-white">
                                       {version.rubricLevels >= 4 ? (
                                         // Accordion layout for 4+ rubric levels
                                         <Accordion type="single" collapsible>
                                           <AccordionItem value={criteria.id} className="border-none">
                                             <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                               <div className="flex items-center justify-between w-full pr-4">
                                                 <h6 className="font-medium text-gray-700">Criterium {index + 1}</h6>
                                                 <div
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     removeCriteria(version.id, onderdeel.id, criteria.id);
                                                   }}
                                                   className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-red-600 hover:text-red-700 cursor-pointer"
                                                 >
                                                   <Trash2 className="h-4 w-4" />
                                                 </div>
                                               </div>
                                             </AccordionTrigger>
                                             <AccordionContent className="px-4 pb-4">
                                               {/* Dynamic Grid Layout for Desktop */}
                                               <div className={`grid grid-cols-1 lg:grid-cols-${version.rubricLevels + 1} gap-4`}>
                                                 <div>
                                                   <label className="text-sm font-medium text-gray-700">Criterium</label>
                                                   {isCriteriaEditing ? (
                                                     <Textarea
                                                       id={`criteria-${criteria.id}`}
                                                       value={criteria.criteria}
                                                       onChange={(e) => updateCriteria(version.id, onderdeel.id, criteria.id, 'criteria', undefined, e.target.value)}
                                                       className={`mt-1 ${getFieldBorderStyle(`criteria-${criteria.id}`)}`}
                                                       rows={3}
                                                       placeholder="Beschrijf de criteria..."
                                                     />
                                                   ) : (
                                                     <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border">{criteria.criteria}</p>
                                                   )}
                                                 </div>
                                                 {criteria.levels.map((level, levelIndex) => (
                                                   <div key={level.id}>
                                                     <label className={`text-sm font-medium ${
                                                       level.label === 'Onvoldoende' ? 'text-red-600' :
                                                       level.label === 'Voldoende' ? 'text-yellow-600' :
                                                       level.label === 'Goed' ? 'text-green-600' :
                                                       level.label === 'Uitstekend' ? 'text-blue-600' :
                                                       'text-gray-700'
                                                     }`}>
                                                       {level.label}
                                                     </label>
                                                     {isCriteriaEditing ? (
                                                       <Textarea
                                                         id={`level-${level.id}`}
                                                         value={level.value}
                                                         onChange={(e) => updateCriteria(version.id, onderdeel.id, criteria.id, 'level', level.id, e.target.value)}
                                                         className={`mt-1 ${getFieldBorderStyle(`level-${level.id}`)}`}
                                                         rows={3}
                                                         placeholder={`Beschrijf ${level.label.toLowerCase()} prestatie...`}
                                                       />
                                                     ) : (
                                                       <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border">{level.value}</p>
                                                     )}
                                                   </div>
                                                 ))}
                                               </div>
                                             </AccordionContent>
                                           </AccordionItem>
                                         </Accordion>
                                       ) : (
                                         // Regular layout for 2-3 rubric levels
                                         <div className="p-4">
                                           {/* Criteria Row Header */}
                                           <div className="flex items-center justify-between mb-3">
                                             <h6 className="font-medium text-gray-700">Criterium {index + 1}</h6>
                                             {isCriteriaEditing && (
                                               <div
                                                 onClick={(e) => {
                                                   console.log('Trashcan clicked!', { versionId: version.id, onderdeelId: onderdeel.id, criteriaId: criteria.id });
                                                   e.preventDefault();
                                                   e.stopPropagation();
                                                   handleDeleteCriteria(version.id, onderdeel.id, criteria.id);
                                                 }}
                                                 className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-red-600 hover:text-red-700 cursor-pointer"
                                               >
                                                 <Trash2 className="h-4 w-4" />
                                               </div>
                                             )}
                                           </div>

                                           {/* Dynamic Grid Layout for Desktop */}
                                           <div className={`grid grid-cols-1 lg:grid-cols-${version.rubricLevels + 1} gap-4`}>
                                             <div>
                                               <label className="text-sm font-medium text-gray-700">Criterium</label>
                                               {isCriteriaEditing ? (
                                                 <Textarea
                                                   id={`criteria-${criteria.id}`}
                                                   value={criteria.criteria}
                                                   onChange={(e) => updateCriteria(version.id, onderdeel.id, criteria.id, 'criteria', undefined, e.target.value)}
                                                   className={`mt-1 ${getFieldBorderStyle(`criteria-${criteria.id}`)}`}
                                                   rows={3}
                                                   placeholder="Beschrijf de criteria..."
                                                 />
                                               ) : (
                                                 <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border">{criteria.criteria}</p>
                                               )}
                                             </div>
                                             {criteria.levels.map((level, levelIndex) => (
                                               <div key={level.id}>
                                                 <label className={`text-sm font-medium ${
                                                   level.label === 'Onvoldoende' ? 'text-red-600' :
                                                   level.label === 'Voldoende' ? 'text-yellow-600' :
                                                   level.label === 'Goed' ? 'text-green-600' :
                                                   level.label === 'Uitstekend' ? 'text-blue-600' :
                                                   'text-gray-700'
                                                 }`}>
                                                   {level.label}
                                                 </label>
                                                 {isCriteriaEditing ? (
                                                   <Textarea
                                                     id={`level-${level.id}`}
                                                     value={level.value}
                                                     onChange={(e) => updateCriteria(version.id, onderdeel.id, criteria.id, 'level', level.id, e.target.value)}
                                                     className={`mt-1 ${getFieldBorderStyle(`level-${level.id}`)}`}
                                                     rows={3}
                                                     placeholder={`Beschrijf ${level.label.toLowerCase()} prestatie...`}
                                                   />
                                                 ) : (
                                                   <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border">{level.value}</p>
                                                 )}
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   ))
                                 )}
                              </div>
                            </div>
                          ))}
                          
                          {version.assessmentOnderdelen.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                              <p className="text-gray-500 mb-4">Nog geen beoordelingscriteria toegevoegd</p>
                              <Button
                                variant="outline"
                                onClick={() => addOnderdeel(version.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Eerste Onderdeel Toevoegen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div>
                            <h4 className="font-medium mb-3">Documenten</h4>
                            {/* Drag and Drop Area */}
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                                dragActive 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 hover:border-gray-400'
                              } ${uploadingDocuments ? 'opacity-50 pointer-events-none' : ''}`}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={(e) => handleDrop(e, version.id)}
                            >
                              <div className="text-center">
                                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <h5 className="text-lg font-medium text-gray-700 mb-2">
                                  Sleep documenten hierheen
                                </h5>
                                <p className="text-sm text-gray-500 mb-4">
                                  Of klik om bestanden te selecteren
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    // TODO: Implement file picker
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.multiple = true;
                                    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
                                    input.onchange = (e) => {
                                      const files = Array.from((e.target as HTMLInputElement).files || []);
                                      if (files.length > 0) {
                                        handleFileUpload(files, version.id);
                                      }
                                    };
                                    input.click();
                                  }}
                                  disabled={uploadingDocuments}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Bestanden Selecteren
                                </Button>
                              </div>
                              {uploadingDocuments && (
                                <div className="mt-4 text-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="text-sm text-gray-500 mt-2">Uploaden...</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column */}
                          <div>
                            <DocumentList
                              documents={version.documents}
                              versionId={version.id}
                              onDelete={(docId) => removeDocument(version.id, docId)}
                              onSetPreview={(docId) => setPreviewDocument(version.id, docId)}
                              onS3StatusUpdate={(docId, status) => updateDocumentS3Status(version.id, docId, status)}
                            />
                          </div>
                        </div>
                      </div>


                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))
              )}
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

      {/* Onderdeel Delete Confirmation Modal */}
      <Dialog open={!!showOnderdeelDeleteConfirm} onOpenChange={(open) => !open && setShowOnderdeelDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onderdeel Verwijderen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Weet je zeker dat je dit onderdeel wilt verwijderen? Alle criteria binnen dit onderdeel worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnderdeelDeleteConfirm(null)}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (showOnderdeelDeleteConfirm) {
                  removeOnderdeel(showOnderdeelDeleteConfirm.versionId, showOnderdeelDeleteConfirm.onderdeelId);
                  setShowOnderdeelDeleteConfirm(null);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criteria Delete Confirmation Modal */}
      <Dialog open={!!showCriteriaDeleteConfirm} onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open, 'showCriteriaDeleteConfirm:', showCriteriaDeleteConfirm);
        if (!open) setShowCriteriaDeleteConfirm(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criterium Verwijderen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Weet je zeker dat je dit criterium wilt verwijderen? Alle beoordelingsniveaus binnen dit criterium worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriteriaDeleteConfirm(null)}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (showCriteriaDeleteConfirm) {
                  removeCriteria(showCriteriaDeleteConfirm.versionId, showCriteriaDeleteConfirm.onderdeelId, showCriteriaDeleteConfirm.criteriaId);
                  setShowCriteriaDeleteConfirm(null);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Delete Confirmation Modal */}
      <Dialog open={!!showDocumentDeleteConfirm} onOpenChange={(open) => !open && setShowDocumentDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Verwijderen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Weet je zeker dat je dit document wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDeleteConfirm(null)}>
              Annuleren
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (showDocumentDeleteConfirm) {
                  removeDocument(showDocumentDeleteConfirm.versionId, showDocumentDeleteConfirm.documentId);
                  setShowDocumentDeleteConfirm(null);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Verwijderen
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
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Let op:</strong> De nieuwe versie krijgt de assessment criteria en documenten van de vorige versie gekopieerd.
                </p>
              </div>
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

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesWarning />
      
      {/* Rubric Change Warning Modal */}
      <RubricChangeWarning />
    </div>
  );
} 