"use client"

import React from "react";

const ProcessVideo = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-examen-dark mb-4">
            Hoe het werkt
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Bekijk onze uitleg over hoe het Exa.men proces werkt voor MBO-scholen.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg">
        <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg">
  <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
    <iframe
      src="https://player.vimeo.com/video/672297144?badge=0&autopause=0&player_id=0&app_id=58479"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
      allowFullScreen
      title="Exa.men ontwikkelproces"
    ></iframe>
  </div>
</div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Onze AI-gedreven aanpak maakt het ontwikkelen van kwalitatieve examenproducten eenvoudig en efficiënt.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProcessVideo;