"use client"

import { Mail, Phone, MapPin, Linkedin } from "lucide-react";
import Link from "next/link";
import { downloadInkoopvoorwaarden } from "../../lib/utils";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Function to handle PDF download
  const handleDownload = (fileName: string) => {
    // Create an empty PDF blob - in a real scenario, this would be replaced with actual PDF content
    const emptyPdfBlob = new Blob([''], {
      type: 'application/pdf'
    });

    // Create a download link and trigger it
    const link = document.createElement('a');
    link.href = URL.createObjectURL(emptyPdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <footer id="contact" className="bg-examen-dark text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <span className="text-2xl font-bold">
                exa<span className="text-examen-cyan">.</span>men
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              Toekomstbestendige examinering voor MBO-scholen. Schaalbaar, betaalbaar en innovatief.
            </p>
            <div className="flex space-x-4">
              <Link href="https://linkedin.com" className="text-gray-400 hover:text-examen-cyan">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Downloads</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/handboek.pdf"
                  download
                  className="text-gray-400 hover:text-examen-cyan text-left"
                >
                  Handboek constructie en vaststelling
                </a>
              </li>
              <li>
                <a 
                  href="/certificaat.pdf"
                  download
                  className="text-gray-400 hover:text-examen-cyan text-left"
                >
                  Certificaat examenleverancier
                </a>
              </li>
              <li>
                <a
                  href="/klachtenprocedure.pdf"
                  download
                  className="text-gray-400 hover:text-examen-cyan text-left"
                >
                  Klachtenprocedure
                </a>
              </li>
              <li>
                <a
                  href="/FAQ.pdf"
                  download
                  className="text-gray-400 hover:text-examen-cyan text-left"
                >
                  Veelgestelde vragen en antwoorden (FAQ)
                </a>
              </li>
              <li>
                <a
                  href="/aanbod.pdf"
                  download 
                  className="text-gray-400 hover:text-examen-cyan text-left"
                >
                  Brochure
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-examen-cyan mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Valkenbergweg 24<br />8026RK, Zwolle</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-examen-cyan mr-3 flex-shrink-0" />
                <Link href="tel:+31382022094" className="text-gray-400 hover:text-examen-cyan">038 202 20 94</Link>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-examen-cyan mr-3 flex-shrink-0" />
                <Link href="mailto:info@exa.men" className="text-gray-400 hover:text-examen-cyan">info@exa.men</Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {currentYear} Exa.men.
            </p>
            <div className="flex space-x-6">
              <button className="text-gray-400 hover:text-examen-cyan text-sm" 
                onClick={() => handleDownload('privacybeleid.pdf')}>
                Privacybeleid
              </button>
              <button className="text-gray-400 hover:text-examen-cyan text-sm" 
                onClick={downloadInkoopvoorwaarden}>
                Inkoopvoorwaarden
              </button>
              <button className="text-gray-400 hover:text-examen-cyan text-sm" 
                onClick={() => handleDownload('cookies.pdf')}>
                Cookies
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;