import { useState, useCallback } from 'react';
import { useApi } from './use-api';

export interface S3VerificationResult {
  document_id: string;
  name: string;
  exists_in_s3: boolean;
  file_path: string;
  size?: number;
  last_modified?: string;
  status: 'available' | 'missing' | 'checking';
}

export interface S3VerificationSummary {
  version_id: string;
  total_documents: number;
  available_documents: number;
  missing_documents: number;
  documents: S3VerificationResult[];
}

export function useS3Verification() {
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<S3VerificationSummary | null>(null);
  const api = useApi();

  const verifyAllDocuments = useCallback(async (versionId: string) => {
    setVerifying(true);
    try {
      const result = await api.verifyAllDocumentsS3(versionId);
      if (result.data) {
        setVerificationResults(result.data as S3VerificationSummary);
      }
      return result;
    } catch (error) {
      // console.error('S3 verification failed:', error);
      throw error;
    } finally {
      setVerifying(false);
    }
  }, [api]);

  const verifySingleDocument = useCallback(async (documentId: string) => {
    try {
      const result = await api.verifyDocumentS3(documentId);
      return result;
    } catch (error) {
      // console.error('Single document S3 verification failed:', error);
      throw error;
    }
  }, [api]);

  return {
    verifying,
    verificationResults,
    verifyAllDocuments,
    verifySingleDocument,
  };
} 