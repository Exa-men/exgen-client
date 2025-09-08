"use client"

import React from 'react';
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useRoleContext } from '../contexts/RoleContext';
import { useCreditModal } from '../contexts/CreditModalContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import CreditDisplay from './CreditDisplay';
import { useSignOut } from '../../hooks/use-sign-out';

const UnifiedHeader: React.FC = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { signOut: handleSignOut } = useSignOut();
  const { isAdmin, clearRole, userRole } = useRoleContext();
  const { openModal } = useCreditModal();
  const { openAuthModal } = useAuthModal();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();

  

  // Clear role cache when signing out
  React.useEffect(() => {
    if (!isSignedIn && isLoaded) {
      // Only clear role if we actually have one to clear
      // This prevents unnecessary re-renders and infinite loops
      if (userRole.user_id !== null) {
        // Add a small delay to let Clerk complete its logout process
        // This prevents interference with Clerk's internal state management
        const timeoutId = setTimeout(() => {
          clearRole();
        }, 100); // 100ms delay
        
        // Cleanup timeout if component unmounts
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isSignedIn, isLoaded, clearRole, userRole.user_id]); // clearRole is now stable with useCallback

  // Helper to determine if a path is active
  const isActive = (href: string) => {
    if (href === '/catalogus') return pathname.startsWith('/catalogus');
    if (href === '/agents') return pathname.startsWith('/agents');
    if (href === '/verificatie') return pathname.startsWith('/verificatie');
    if (href === '/users') return pathname.startsWith('/users');
    if (href === '/admin/credit-orders') return pathname.startsWith('/admin/credit-orders');
    if (href === '/admin/vouchers') return pathname.startsWith('/admin/vouchers');
    if (href === '/?show=true' || href === '/') return pathname === '/' || pathname === '/?show=true';
    return pathname === href;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-3xl font-bold text-examen-dark">
                exa<span className="text-examen-cyan">.</span>men
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isLoaded && isSignedIn && (
              <>
                {/* Regular User Navigation */}
                <Link href="/catalogus">
                  <Button
                    variant="ghost"
                    className={
                      isActive('/catalogus')
                        ? "text-examen-cyan font-bold underline underline-offset-4"
                        : "text-gray-700 hover:text-examen-cyan transition-colors"
                    }
                  >
                    Catalogus
                  </Button>
                </Link>
                <Link href="/verificatie">
                  <Button
                    variant="ghost"
                    className={
                      isActive('/verificatie')
                        ? "text-examen-cyan font-bold underline underline-offset-4"
                        : "text-gray-700 hover:text-examen-cyan transition-colors"
                    }
                  >
                    Verificatie
                  </Button>
                </Link>

                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    <Link href="/agents">
                      <Button
                        variant="ghost"
                        className={
                          isActive('/agents')
                            ? "text-examen-cyan font-bold underline underline-offset-4"
                            : "text-gray-700 hover:text-examen-cyan transition-colors"
                        }
                      >
                        Agents
                      </Button>
                    </Link>
                    <Link href="/users">
                      <Button
                        variant="ghost"
                        className={
                          isActive('/users')
                            ? "text-examen-cyan font-bold underline underline-offset-4"
                            : "text-gray-700 hover:text-examen-cyan transition-colors"
                        }
                      >
                        Users
                      </Button>
                    </Link>
                    <Link href="/admin/credit-orders">
                      <Button
                        variant="ghost"
                        className={
                          isActive('/admin/credit-orders')
                            ? "text-examen-cyan font-bold underline underline-offset-4"
                            : "text-gray-700 hover:text-examen-cyan transition-colors"
                        }
                      >
                        Orders
                      </Button>
                    </Link>

                    <Link href="/admin/vouchers">
                      <Button
                        variant="ghost"
                        className={
                          isActive('/admin/vouchers')
                            ? "text-examen-cyan font-bold underline underline-offset-4"
                            : "text-gray-700 hover:text-examen-cyan transition-colors"
                        }
                      >
                        Vouchers
                      </Button>
                    </Link>

                  </>
                )}
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center flex-shrink-0 gap-4">
            {isLoaded && isSignedIn && (
              <>
                <CreditDisplay onOrderCredits={openModal} />
                <UserButton afterSignOutUrl="/" />
              </>
            )}
            {isLoaded && !isSignedIn && (
              <>
                <Button 
                  variant="outline" 
                  className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100"
                  onClick={() => openAuthModal('sign-up')}
                >
                  Registreer
                </Button>
                <Button 
                  className="bg-examen-cyan hover:bg-examen-cyan-600 text-white"
                  onClick={() => openAuthModal('sign-in')}
                >
                  Login
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-examen-cyan focus:outline-none"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {isLoaded && isSignedIn && (
                <>
                  {/* Regular User Navigation */}
                  <Link href="/catalogus">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/catalogus')
                          ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                          : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                      }
                    >
                      Catalogus
                    </Button>
                  </Link>
                  <Link href="/verificatie">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/verificatie')
                          ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                          : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                      }
                    >
                      Verificatie
                    </Button>
                  </Link>

                  {/* Admin Navigation */}
                  {isAdmin && (
                    <>
                      <Link href="/agents">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/agents')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Agents
                        </Button>
                      </Link>
                      <Link href="/users">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/users')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Users
                        </Button>
                      </Link>
                      <Link href="/admin/credit-orders">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/admin/credit-orders')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Orders
                        </Button>
                      </Link>

                      <Link href="/admin/vouchers">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/admin/vouchers')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Vouchers
                        </Button>
                      </Link>

                    </>
                  )}

                  {/* Mobile User Actions */}
                  <div className="pt-4 border-t border-gray-200">
                    {isLoaded && isSignedIn && (
                      <>
                        <div className="flex flex-col items-center gap-4">
                          <CreditDisplay onOrderCredits={openModal} />
                          <UserButton afterSignOutUrl="/" />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {isLoaded && !isSignedIn && (
                <>
                  <Button 
                    variant="outline" 
                    className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100 w-full justify-start"
                    onClick={() => openAuthModal('sign-up')}
                  >
                    Registreer
                  </Button>
                  <Button 
                    className="bg-examen-cyan hover:bg-examen-cyan-600 text-white w-full justify-start"
                    onClick={() => openAuthModal('sign-in')}
                  >
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default UnifiedHeader; 