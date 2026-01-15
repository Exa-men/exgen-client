"use client";

import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useAuthModal } from "../contexts/AuthModalContext";

const Hero = () => {
  const { openAuthModal } = useAuthModal();

  return (
    <div className="relative bg-gradient-to-br from-examen-cyan-200 via-white to-examen-mint-100 pt-20 pb-24 md:pt-24 md:pb-28 overflow-hidden">
      {/* Background image with high transparency */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-examen-cyan-200 via-white to-examen-mint-100 opacity-90"></div>
        <Image
          src="/hero-avatar.png"
          alt="Hero background"
          fill
          className="object-cover object-center opacity-20 mix-blend-multiply"
          aria-hidden="true"
          priority
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12 mb-12 lg:mb-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-examen-dark leading-tight mb-6">
              Toekomstbestendige examinering voor MBO-scholen
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl">
              Exa.men maakt examinering schaalbaar, betaalbaar en
              toekomstgericht. Een complete oplossing voor het inkopen én
              ontwikkelen van examenproducten.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-examen-cyan hover:bg-examen-cyan-600 text-white"
                onClick={() => openAuthModal("sign-up")}
              >
                Registreer
                <ArrowRight size={18} className="ml-2" />
              </Button>
              {/* <Link href="/demo">
                <Button size="lg" variant="outline" className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100">
                  Demo aanvragen
                </Button>
              </Link> */}
            </div>
          </div>
          {/*<div className="lg:w-1/2 relative">
            <div className="relative z-10 bg-white p-4 md:p-8 rounded-xl shadow-xl animate-float">
              <div className="absolute -top-3 -left-3 md:-top-5 md:-left-5 w-16 h-16 md:w-24 md:h-24 bg-examen-mint rounded-full opacity-50"></div>
              <div className="relative z-20">
                <div className="bg-examen-cyan mb-6 text-white inline-block py-1 px-3 rounded-full text-sm font-medium">
                  AI-gedreven
                </div>
                <div className="relative">
                  <div className="absolute -top-2 -right-2 transform rotate-12 bg-yellow-500 text-white px-3 py-1 text-sm font-bold rounded shadow-lg z-30">
                    Pending | Onderzoeks fase
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    🤖 Examenontwikkeling in 30 minuten?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Van 53 uur naar minder dan een uur: onze AI-agent stelt
                    vakdocenten in staat zelf valideerbare examenproducten te
                    ontwikkelen.
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-examen-cyan">
                    Conform norm valide exameninstrumenten
                  </span>
                  <span className="bg-examen-mint-200 text-examen-mint-900 text-xs font-semibold px-2.5 py-0.5 rounded">
                    Nieuw
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 md:-bottom-8 md:-right-8 w-24 h-24 md:w-40 md:h-40 bg-examen-cyan rounded-lg opacity-20 z-0"></div>
          </div>*/}
        </div>
      </div>
    </div>
  );
};

export default Hero;
