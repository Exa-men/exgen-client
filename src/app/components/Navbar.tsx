"use client"

import React from 'react';
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import Link from 'next/link';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="py-4 w-full bg-white">
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
            <a href="#oplossingen" className="text-gray-700 hover:text-examen-cyan transition-colors">
              Oplossingen
            </a>
            <a href="#voordelen" className="text-gray-700 hover:text-examen-cyan transition-colors">
              Voordelen
            </a>
            <a href="#contact" className="text-gray-700 hover:text-examen-cyan transition-colors">
              Contact
            </a>
            <Link href="https://app.exa.men">
              <Button className="bg-examen-cyan hover:bg-examen-cyan-600 text-white">
                Open App
              </Button>
            </Link>
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
              <a href="#oplossingen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                Oplossingen
              </a>
              <a href="#voordelen" className="text-gray-700 hover:text-examen-cyan transition-colors">
                Voordelen
              </a>
              <a href="#contact" className="text-gray-700 hover:text-examen-cyan transition-colors">
                Contact
              </a>
              <Link href="https://app.exa.men">
                <Button className="bg-examen-cyan hover:bg-examen-cyan-600 text-white w-full">
                  Open App
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;