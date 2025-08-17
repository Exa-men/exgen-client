"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle, Gift, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';

interface WelcomeBannerProps {
  onVoucherActivated: (newBalance: number) => void;
}

export default function WelcomeBanner({ onVoucherActivated }: WelcomeBannerProps) {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const api = useApi();
  const [isActivating, setIsActivating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [voucherActivated, setVoucherActivated] = useState(false);

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
    if (!isSignedIn || !user) return;

    setIsActivating(true);
    setError(null);

    try {
      const { error } = await api.markFirstLogin();

      if (error) {
        console.error('Error activating welcome voucher:', error);
        setError('Failed to activate welcome voucher');
        return;
      }

      // Update local state
      setVoucherActivated(true);
      
      // Notify parent component
      if (onVoucherActivated) {
        onVoucherActivated(10); // Welcome voucher gives 10 credits
      }
      
      toast.success('Welcome voucher activated successfully! You received 10 credits.');
      
      // Switch to celebration mode
      setIsActivating(false);
      setIsCelebrating(true);
      
      // Trigger confetti animation
      triggerConfetti();
      
      // Wait a bit for confetti to show, then hide banner
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);

    } catch (error) {
      console.error('Error activating welcome voucher:', error);
      setError(error instanceof Error ? error.message : 'Niet gelukt om de voucher te activeren, neem contact via support@exa.men');
      setIsActivating(false);
    } finally {
      setIsActivating(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl shadow-xl border border-blue-100 mb-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent"></div>
      
      {/* Content */}
      <div className="relative z-10 p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-6">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
                <Gift className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  WELKOM IN DE NIEUWE EXA.MENKLUIS 🎉✨
                </h1>
                
                <h2 className="text-xl lg:text-2xl font-semibold text-blue-600">
                  Sneller. Slimmer. Betrouwbaarder.
                </h2>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  De toekomst van examineren begint hier. Exa.men versnelt examenontwikkeling met technologie die werkt—voor scholen, docenten én studenten.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {[
                  "Direct toegang tot gevalideerde examenproducten",
                  "Slimme, digitale beoordelingsinstrumenten", 
                  "AI-ondersteunde ontwikkeling voor meer snelheid en kwaliteit"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-800 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Additional text */}
              <div className="pt-2">
                <p className="text-gray-700 font-medium">
                  Als gecertificeerde MBO-examenleverancier staan we klaar om het verschil te maken.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* CTA Button */}
              <div className="pt-4">
                <Button
                  onClick={handleActivateVoucher}
                  disabled={isActivating || isCelebrating}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg px-8 py-4 h-auto rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105"
                >
                  {isActivating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Voucher activeren...
                    </>
                  ) : isCelebrating ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-3 animate-pulse" />
                      Voucher geactiveerd! 🎉
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-3" />
                      ACTIVEER JE VOUCHER
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-blue-500/10 rounded-full animate-pulse"></div>
      <div className="absolute bottom-4 left-1/4 w-12 h-12 bg-blue-300/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>
  );
}