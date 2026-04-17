"use client";

import React from "react";
import { X } from "lucide-react";
import { useCreditModal } from "../contexts/CreditModalContext";

const CreditInfoModal: React.FC = () => {
  const { isOpen, closeModal } = useCreditModal();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Credits Bestellen</h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-lg font-semibold text-gray-900">
            🎁 Credits via code — momenteel kosteloos
          </p>
          <p className="text-gray-700">
            Om examenproducten aan te schaffen heb je credits nodig. Credits zijn alleen
            verkrijgbaar via{" "}
            <a
              href="mailto:info@exa.men"
              className="text-examen-cyan hover:underline"
            >
              info@exa.men
            </a>
            .
          </p>
          <p className="text-gray-700">
            Mail naar{" "}
            <a
              href="mailto:info@exa.men"
              className="text-examen-cyan hover:underline"
            >
              info@exa.men
            </a>{" "}
            en vermeld:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Van welke school je bent</li>
            <li>Welk examen je wilt afnemen</li>
            <li>Bij welke opleiding de studenten zijn ingeschreven</li>
            <li>Voor hoeveel studenten je het examen wilt inzetten</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreditInfoModal;
