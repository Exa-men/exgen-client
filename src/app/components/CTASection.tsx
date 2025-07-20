"use client"

import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { SignUpButton } from '@clerk/nextjs';

const CTASection = () => {
  return (
    <section className="py-16 bg-examen-cyan">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 max-w-3xl mx-auto">
          Klaar om de toekomst van examinering te ervaren?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Registreer op onze app en bekijk de catalogus met bestaande examenproducten.
        </p>
        <div className="flex justify-center">
          <SignUpButton mode="modal">
            <Button size="lg" className="bg-white text-examen-cyan hover:bg-gray-100">
              Registreer
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </SignUpButton>
        </div>
      </div>
    </section>
  );
};

export default CTASection;