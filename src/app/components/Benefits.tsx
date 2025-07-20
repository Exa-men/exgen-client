
import { CheckCircle } from "lucide-react";

const Benefits = () => {
  const benefits = [
    "Naadloze integratie van examinering in het leerproces",
    "Minder werkdruk voor docenten en examencommissies",
    "Efficiënter en betekenisvoller onderwijs",
    "Snellere ontwikkeling van nieuwe opleidingen",
    "Directe aansluiting op arbeidsmarktvragen",
    "Conform alle standaarden van examencommissies",
    "Volledig schaalbaar en kostenefficiënt",
    "Toekomstbestendig dankzij AI-technologie"
  ];

  return (
    <section id="voordelen" className="py-16 bg-gradient-to-br from-examen-cyan-100 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 mb-12 lg:mb-0">
            <h2 className="text-3xl md:text-4xl font-bold text-examen-dark mb-6">
              De voordelen van Exa.men
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-xl">
              Onze geïntegreerde aanpak lost hardnekkige knelpunten op in het beroepsonderwijs 
              en maakt examinering toekomstgericht.
            </p>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-examen-cyan-200">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-examen-mint-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-examen-mint-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Bewezen kwaliteit</h3>
                  <p className="text-gray-600">
                    Als gecertificeerd examenleverancier voldoen al onze producten aan de strengste kwaliteitseisen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 lg:pl-12">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-xl font-semibold mb-6 text-examen-dark">
                Wat Exa.men voor uw onderwijsinstelling betekent:
              </h3>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-examen-cyan mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
