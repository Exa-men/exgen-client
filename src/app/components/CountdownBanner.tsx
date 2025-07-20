'use client';

import { useState, useEffect } from 'react';

export function CountdownBanner() {
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    // FIX: set a fixed target date
    const targetDate = new Date('2025-05-30T00:00:00');

    const calculateDaysRemaining = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
      setDaysRemaining(days);
    };

    calculateDaysRemaining();

    const interval = setInterval(calculateDaysRemaining, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-blue-600 text-white py-2">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>
          Nog {daysRemaining} dagen tot de nieuwe app beschikbaar is! 🚀
        </p>
      </div>
    </div>
  );
}
