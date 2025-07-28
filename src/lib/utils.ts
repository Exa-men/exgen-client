import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Downloads the inkoopvoorwaarden PDF file
 */
export function downloadInkoopvoorwaarden() {
  const link = document.createElement('a');
  link.href = '/inkoopvoorwaarden.pdf';
  link.download = 'inkoopvoorwaarden.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 