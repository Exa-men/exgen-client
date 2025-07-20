"use client"

import React from 'react';
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import Link from 'next/link';
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';

const UnifiedHeader = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="py-4 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-3xl font-bold text-examen-dark">
                exa<span className="text-examen-cyan">.</span>men
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Show navigation links for non-authenticated users */}
            {!isSignedIn && (
              <>
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
            
            {/* Show Home button for authenticated users */}
            {isSignedIn && (
              <Link href="/">
                <Button variant="ghost" className="text-gray-700 hover:text-examen-cyan transition-colors">
                  Home
                </Button>
              </Link>
            )}

            {/* Authentication buttons */}
            {isLoaded && (
              <>
                {!isSignedIn ? (
                  <div className="flex items-center space-x-4">
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
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link href="/workflows">
                      <Button variant="ghost" className="text-gray-700 hover:text-examen-cyan transition-colors">
                        Workflows
                      </Button>
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                )}
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
              {/* Show navigation links for non-authenticated users */}
              {!isSignedIn && (
                <>
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
              
              {/* Show Home button for authenticated users */}
              {isSignedIn && (
                <Link href="/">
                  <Button variant="ghost" className="text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start">
                    Home
                  </Button>
                </Link>
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
                        <Button variant="ghost" className="text-gray-700 hover:text-examen-cyan transition-colors w-full justify-start">
                          Workflows
                        </Button>
                      </Link>
                      <div className="flex justify-center">
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