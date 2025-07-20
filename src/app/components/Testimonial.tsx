"use client"

import React from "react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "./ui/carousel";
import { CircleDot } from "lucide-react";

// Testimonial data structure
interface TestimonialData {
  quote: string;
  author: string;
  role: string;
  initials: string;
}

// Sample testimonials data
const testimonials: TestimonialData[] = [
  {
    quote: "Met de AI-oplossing van Exa.men kunnen we de ontwikkeltijd van examens met 90% terugbrengen. Dit verminderd werkdruk bij scholen, maar stelt ons ook in staat om flexibel in te spelen op nieuwe onderwijsbehoeften.",
    author: "Johan Schaap",
    role: "Oprichter All You Can Learn, onderwijs innovatie",
    initials: "JS"
  },
  {
    quote: "Dankzij Exa.men besparen we enorm veel tijd bij het voorbereiden van onze toetsen. De kwaliteit blijft hoog, terwijl we als docententeam meer tijd overhouden voor onze leerlingen.",
    author: "Marieke de Vries",
    role: "Teamleider HAVO/VWO, Stedelijk Lyceum",
    initials: "MV"
  },
  {
    quote: "De adaptieve functionaliteit van Exa.men maakt gepersonaliseerd leren echt mogelijk. Onze leerlingen zijn enthousiaster en scoren gemiddeld 15% beter sinds we zijn overgestapt.",
    author: "Peter Bakker",
    role: "Directeur ROC Techniek & ICT",
    initials: "PB"
  }
];

const Testimonial = () => {
  const [api, setApi] = React.useState<any>(null);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="py-16 bg-gradient-to-r from-examen-cyan-50 to-examen-mint-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            setApi={setApi}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 py-8 md:py-10">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 md:p-10 mx-auto relative">
                    <blockquote className="relative z-10">
                      <p className="text-lg md:text-xl text-gray-700 mb-8 italic leading-relaxed">{testimonial.quote}</p>
                      <div className="flex items-center">
                      </div>
                    </blockquote>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <div className="mt-6 flex justify-center gap-2 w-full">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`h-2.5 rounded-full transition-all ${
                    current === index ? "w-6 bg-examen-cyan" : "w-2.5 bg-gray-300 hover:bg-examen-cyan/50"
                  }`}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;