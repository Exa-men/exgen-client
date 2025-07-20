import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Star } from 'lucide-react';

interface Version {
  version: string;
  isLatest: boolean;
}

interface ExamProduct {
  id: string;
  code: string;
  title: string;
  versions: Version[];
}

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    productId: string;
    version: string;
    description: string;
    stars: number;
  }) => void;
  product: ExamProduct;
  defaultVersion: string;
}

export default function FeedbackModal({ open, onClose, onSubmit, product, defaultVersion }: FeedbackModalProps) {
  const [version, setVersion] = useState(defaultVersion);
  const [description, setDescription] = useState('');
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    setSubmitting(true);
    await onSubmit({
      productId: product.id,
      version,
      description,
      stars,
    });
    setSubmitting(false);
    setDescription('');
    setStars(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback geven</DialogTitle>
        </DialogHeader>
        <div className="mb-2">
          <div className="text-sm text-gray-500 mb-1">Examentitel</div>
          <div className="font-semibold text-lg mb-2">{product.title}</div>
          <div className="text-sm text-gray-500 mb-1">Examencode</div>
          <div className="font-mono mb-2">{product.code}</div>
          <div className="text-sm text-gray-500 mb-1">Versie</div>
          <select
            className="w-full border rounded px-3 py-2 mb-2"
            value={version}
            onChange={e => setVersion(e.target.value)}
          >
            {product.versions.map(v => (
              <option key={v.version} value={v.version}>
                {v.version} {v.isLatest ? '(laatste)' : ''}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-500 mb-1">Feedback</div>
          <textarea
            className="w-full border rounded px-3 py-2 mb-2 min-h-[80px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Beschrijf je ervaring met dit examen..."
          />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">Beoordeling (optioneel):</span>
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                className="focus:outline-none"
                onClick={() => setStars(n)}
                onMouseEnter={() => setHoverStars(n)}
                onMouseLeave={() => setHoverStars(0)}
              >
                <Star className={
                  n <= (hoverStars || stars)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                } />
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={submitting || !description.trim()}>
            Verzenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 