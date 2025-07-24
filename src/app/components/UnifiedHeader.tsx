"use client"

import React from 'react';
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import Link from 'next/link';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useRole } from '../../hooks/use-role';
import CreditDisplay from './CreditDisplay';

interface UnifiedHeaderProps {
  onOrderCredits?: () => void;
}

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({ onOrderCredits }) => {
  const { isSignedIn, isLoaded } = useUser();
  const { isAdmin } = useRole();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Helper to determine if a path is active
  const isActive = (href: string) => {
    if (href === '/catalogus') return pathname.startsWith('/catalogus');
    if (href === '/workflows') return pathname.startsWith('/workflows');
    if (href === '/users') return pathname.startsWith('/users');
    if (href === '/admin/credit-orders') return pathname.startsWith('/admin/credit-orders');
    if (href === '/admin/vouchers') return pathname.startsWith('/admin/vouchers');
    if (href === '/system') return pathname.startsWith('/system');
    if (href === '/analytics') return pathname.startsWith('/analytics');
    if (href === '/?show=true' || href === '/') return pathname === '/' || pathname === '/?show=true';
    return pathname === href;
  };

  return (
    <nav className="py-4 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo on the left */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-3xl font-bold text-examen-dark">
                exa<span className="text-examen-cyan">.</span>men
              </span>
            </Link>
          </div>

          {/* Centered navigation (desktop only) */}
          <div className="hidden md:flex flex-1 justify-center items-center">
            <div className="flex items-center space-x-8">
              {!isSignedIn && (
                <>
                  <Link href="/">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/')
                          ? "text-examen-cyan font-bold underline underline-offset-4"
                          : "text-gray-700 hover:text-examen-cyan transition-colors"
                      }
                    >
                      Home
                    </Button>
                  </Link>
                  <a href="#oplossingen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Oplossingen
                  </a>
                  <a href="#voordelen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Voordelen
                  </a>
                  <a href="#contact" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Contact
                  </a>
                </>
              )}
              {isSignedIn && (
                <>
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
                  <Link href="/workflows">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/workflows')
                          ? "text-examen-cyan font-bold underline underline-offset-4"
                          : "text-gray-700 hover:text-examen-cyan transition-colors"
                      }
                    >
                      Ontwikkelen
                    </Button>
                  </Link>
                  {isAdmin && (
                    <>
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
                      <Link href="/system">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/system')
                              ? "text-examen-cyan font-bold underline underline-offset-4"
                              : "text-gray-700 hover:text-examen-cyan transition-colors"
                          }
                        >
                          System
                        </Button>
                      </Link>
                      <Link href="/analytics">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/analytics')
                              ? "text-examen-cyan font-bold underline underline-offset-4"
                              : "text-gray-700 hover:text-examen-cyan transition-colors"
                          }
                        >
                          Analytics
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* User profile or auth buttons on the right (desktop only) */}
          <div className="hidden md:flex items-center flex-shrink-0 gap-4">
            {isLoaded && isSignedIn && (
              <>
                <CreditDisplay onOrderCredits={onOrderCredits} />
                <UserButton afterSignOutUrl="/" />
              </>
            )}
            {isLoaded && !isSignedIn && (
              <>
                <SignUpButton mode="modal">
                  <Button variant="outline" className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100">
                    Registreer
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button className="bg-examen-cyan hover:bg-examen-cyan-600 text-white">
                    Login
                  </Button>
                </SignInButton>
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
          <div className="md:hidden mt-4 bg-white py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4 px-2">
              {!isSignedIn && (
                <>
                  <Link href="/">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/')
                          ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                          : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                      }
                    >
                      Home
                    </Button>
                  </Link>
                  <a href="#oplossingen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Oplossingen
                  </a>
                  <a href="#voordelen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Voordelen
                  </a>
                  <a href="#contact" className="text-gray-700 hover:text-examen-cyan transition-colors">
                    Contact
                  </a>
                </>
              )}
              {isSignedIn && (
                <>
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
                  <Link href="/workflows">
                    <Button
                      variant="ghost"
                      className={
                        isActive('/workflows')
                          ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                          : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                      }
                    >
                      Ontwikkelen
                    </Button>
                  </Link>
                  {isAdmin && (
                    <>
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
                      <Link href="/system">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/system')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          System
                        </Button>
                      </Link>
                      <Link href="/analytics">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/analytics')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Analytics
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              )}
              
              {/* Authentication buttons */}
              {isLoaded && (
                <>
                  {!isSignedIn ? (
                    <>
                      <SignUpButton mode="modal">
                        <Button variant="outline" className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100 w-full">
                          Registreer
                        </Button>
                      </SignUpButton>
                      <SignInButton mode="modal">
                        <Button className="bg-examen-cyan hover:bg-examen-cyan-600 text-white w-full">
                          Login
                        </Button>
                      </SignInButton>
                    </>
                  ) : (
                    <>
                      <Link href="/workflows">
                        <Button
                          variant="ghost"
                          className={
                            isActive('/workflows')
                              ? "text-examen-cyan font-bold underline underline-offset-4 w-full justify-start"
                              : "text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start"
                          }
                        >
                          Ontwikkelen
                        </Button>
                      </Link>
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
                      <div className="flex flex-col items-center gap-4">
                        <CreditDisplay showLabel onOrderCredits={onOrderCredits} />
                        <UserButton afterSignOutUrl="/" />
                      </div>
                    </>
                  )}
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