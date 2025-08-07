"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check, Gift, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface WelcomeBannerProps {
  onVoucherActivated: (newBalance: number) => void;
}

export default function WelcomeBanner({ onVoucherActivated }: WelcomeBannerProps) {
  const { getToken } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const triggerConfetti = () => {
    try {
      // Custom confetti implementation that covers the entire screen
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'];
      const confettiCount = 100;
      const duration = 3000;
      
      for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.style.position = 'fixed';
          confetti.style.left = Math.random() * window.innerWidth + 'px';
          confetti.style.top = '-10px';
          confetti.style.width = '10px';
          confetti.style.height = '10px';
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.borderRadius = '50%';
          confetti.style.pointerEvents = 'none';
          confetti.style.zIndex = '9999';
          confetti.style.transition = 'all 3s ease-out';
          
          document.body.appendChild(confetti);
          
          // Animate confetti falling
          setTimeout(() => {
            confetti.style.top = window.innerHeight + 'px';
            confetti.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
          }, 10);
          
          // Remove confetti after animation
          setTimeout(() => {
            if (confetti.parentNode) {
              confetti.parentNode.removeChild(confetti);
            }
          }, duration);
        }, i * 20);
      }
    } catch (error) {
      // Silently fail if confetti doesn't work
      console.log('Confetti not supported in this browser');
    }
  };

  const handleActivateVoucher = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/welcome-voucher/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to activate voucher');
      }

      const result = await response.json();
      
      // Switch to celebration mode
      setIsActivating(false);
      setIsCelebrating(true);
      
      // Trigger confetti animation
      triggerConfetti();
      
      // Wait a bit for confetti to show, then hide banner
      setTimeout(() => {
        setIsVisible(false);
        onVoucherActivated(result.new_balance);
      }, 2000);

    } catch (error) {
      console.error('Voucher activation error:', error);
      setError(error instanceof Error ? error.message : 'Niet gelukt om de voucher te activeren, neem contact via support@exa.men');
      setIsActivating(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-gradient-to-r from-yellow-400 to-orange-400 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                WELKOM IN DE NIEUWE EXA.MENKLUIS! 🎉
              </h2>
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">
              Innovatie in het onderwijs begint bij betrouwbare examenproducten die snel beschikbaar zijn. Exa.men heeft de missie om dit mogelijk te maken. Als gecertificeerde leverancier voor MBO examens willen we met nieuwe technologie examenontwikkeling versnellen:
            </p>

            {/* Feature list */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Betrouwbareexamenproducten direct beschikbaar</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Interactive digitale beoordelingsinstrumenten</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Examenontwikkeling met hulp van AI</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Activation button */}
            <Button
              onClick={handleActivateVoucher}
              disabled={isActivating || isCelebrating}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
            >
              {isActivating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Voucher activeren...
                </>
              ) : isCelebrating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Voucher geactiveerd! 🎉
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  ACTIVEER JE VOUCHER
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 