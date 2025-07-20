"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Clock, BrainCircuit, FileText, Sparkles } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Clock className="h-8 w-8 text-examen-cyan" />,
      title: "Lerend kwalificeren",
      description: "Examinering geïntegreerd in het leerproces. Studenten bouwen een digitaal portfolio dat direct dienstdoet als basis voor het examen.",
      benefit: "Geen aparte examendagen meer nodig"
    },
    {
      icon: <BrainCircuit className="h-8 w-8 text-examen-cyan" />,
      title: "AI-gedreven examenontwikkeling",
      description: "Ontwikkel in minder dan een uur een volledig, toetsbaar en valideerbaar examenproduct, zonder technische kennis.",
      benefit: "Van 53 uur naar 30 minuten"
    },
    {
      icon: <FileText className="h-8 w-8 text-examen-cyan" />,
      title: "Gevalideerde examens",
      description: "Als gecertificeerd examenleverancier bieden wij examens in diverse vormen, afgestemd op de eisen van examencommissies.",
      benefit: "Passend binnen elk kwalificatiedossier"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-examen-cyan" />,
      title: "Versnelde onderwijsvernieuwing",
      description: "Nieuwe opleidingen starten binnen weken — in plaats van 9 tot 14 maanden — met vastgestelde examenproducten.",
      benefit: "Snelle aansluiting op arbeidsmarktvragen"
    }
  ];

  return (
    <section id="oplossingen" className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-examen-dark mb-4">
            Onze oplossingen
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Exa.men verbindt examinering en onderwijs voor een efficiëntere en betekenisvollere leerervaring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 border-gray-100 hover:border-examen-cyan-200 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <CardDescription className="inline-flex items-center bg-examen-mint-100 text-examen-mint-900 px-3 py-1 rounded-full text-sm">
                  {feature.benefit}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;