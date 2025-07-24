"use client"

import React, { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Gift, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useCredits } from '../contexts/CreditContext';

interface VoucherRedemptionProps {
  className?: string;
}

const VoucherRedemption: React.FC<VoucherRedemptionProps> = ({ className }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { refreshCredits } = useCredits();
  
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    creditsAdded?: number;
  } | null>(null);

  const handleRedeem = async () => {
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
      handleRedeem();
    }
  };

  const clearResult = () => {
    setRedeemResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-green-600" />
          Voucher Inwisselen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="voucher-code" className="text-sm font-medium text-gray-700">
            Voucher Code
          </label>
          <div className="flex gap-2">
            <Input
              id="voucher-code"
              type="text"
              placeholder="Voer je voucher code in"
              value={voucherCode}
              onChange={(e) => {
                setVoucherCode(e.target.value.toUpperCase());
                if (redeemResult) clearResult();
              }}
              onKeyPress={handleKeyPress}
              className="flex-1 font-mono text-center tracking-wider"
              disabled={isRedeeming}
            />
            <Button
              onClick={handleRedeem}
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
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
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

        <div className="text-xs text-gray-500">
          <p>• Vouchers kunnen maar één keer worden gebruikt</p>
          <p>• Vouchers hebben een vervaldatum</p>
          <p>• Credits worden direct toegevoegd aan je account</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoucherRedemption; 