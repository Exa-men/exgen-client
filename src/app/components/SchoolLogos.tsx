"use client"

import React from "react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "./ui/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

const SchoolLogos = () => {
  // School data with all the provided logos
  const schools = [
    { id: 1, name: "Deltion College", logo: "/client-logos/deltion-college.png" },
    { id: 2, name: "Vista College", logo: "/client-logos/vista-college.png" },
    { id: 3, name: "ROC Friese Poort", logo: "/client-logos/firda.png" },
    { id: 4, name: "MBO Amersfoort", logo: "/client-logos/mbo-amersfoort.png" },
    { id: 5, name: "Scalda", logo: "/client-logos/scalda.png" },
    { id: 6, name: "Aventus", logo: "/client-logos/aventus.png" },
    { id: 7, name: "Albeda", logo: "/client-logos/albeda-college.png" },
    { id: 8, name: "Summa College", logo: "/client-logos/summa-college.png" },
    { id: 9, name: "Zadkine", logo: "/client-logos/zadkine.png" },
    { id: 10, name: "Alfa College", logo: "/client-logos/alfa-college.png" },
    { id: 11, name: "ROC Nijmegen", logo: "/client-logos/roc-nijmegen.png" },
    { id: 12, name: "ROC Midden Nederland", logo: "/client-logos/rocmn.png" },
    { id: 13, name: "ROC Landstede", logo: "/client-logos/landstede.png" },
    { id: 14, name: "Graafschap College", logo: "/client-logos/graafschap-college.png" },
    { id: 15, name: "Koning Willem I College", logo: "/client-logos/kw1c.png" },
    { id: 16, name: "ROC Horizon College", logo: "/client-logos/horizon-college.png" },
    { id: 17, name: "Noorderpoort", logo: "/client-logos/noorderpoort.png" },
    { id: 18, name: "ROC van Amsterdam", logo: "/client-logos/roc-van-amsterdam.png" },
    { id: 19, name: "ROC van Twente", logo: "/client-logos/roc-van-twente.png" },
    { id: 20, name: "ROC Tilburg", logo: "/client-logos/roctilburg.png" },
    { id: 21, name: "Nova College", logo: "/client-logos/nova-college.png" },
    { id: 22, name: "ROC Rivor", logo: "/client-logos/rocrivor.png" },
    { id: 23, name: "Gilde Opleidingen", logo: "/client-logos/gildeopleidingen.png" },
    { id: 24, name: "ROC Ter AA", logo: "/client-logos/rocteraa.png" },
    { id: 25, name: "ROC Da Vinci College", logo: "/client-logos/davinci.png" },
    { id: 26, name: "ROC Kop van Noord-Holland", logo: "/client-logos/rockopnh.png" },
    { id: 27, name: "ROC TOP", logo: "/client-logos/roctop.png" },
    { id: 28, name: "MBO Utrecht", logo: "/client-logos/mbo-utrecht.png" },
    { id: 29, name: "Cibap", logo: "/client-logos/cibap.png" },
    { id: 30, name: "SintLucas", logo: "/client-logos/stlucas.png" },
  ];

  // Groups of 6 logos
  const groupSize = 6;
  const logoGroups = [];
  
  for (let i = 0; i < schools.length; i += groupSize) {
    logoGroups.push(schools.slice(i, i + groupSize));
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-examen-dark mb-2">Vertrouwd door MBO-scholen</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Deze MBO-instellingen werken al met de examenoplossingen van Exa.men
          </p>
        </div>
        
        <div className="relative max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {logoGroups.map((group, groupIndex) => (
                <CarouselItem key={groupIndex}>
                  <div className="flex items-center justify-between gap-4 md:gap-6 px-2">
                    {group.map((school) => (
                      <div key={school.id} className="w-1/6 flex items-center justify-center">
                        <div className="h-14 flex items-center justify-center relative">
                          <Image 
                            src={school.logo} 
                            alt={`${school.name} logo`} 
                            width={100}
                            height={56}
                            className="max-h-full max-w-full object-contain filter grayscale opacity-70 hover:opacity-100 hover:filter-none transition-all duration-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <div className="absolute -left-12 top-1/2 -translate-y-1/2">
              <CarouselPrevious className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 border-none shadow-none">
                <ChevronLeft className="h-4 w-4" />
              </CarouselPrevious>
            </div>
            
            <div className="absolute -right-12 top-1/2 -translate-y-1/2">
              <CarouselNext className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 border-none shadow-none">
                <ChevronRight className="h-4 w-4" />
              </CarouselNext>
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default SchoolLogos;