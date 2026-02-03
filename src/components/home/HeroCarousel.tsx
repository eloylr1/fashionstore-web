/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Hero Carousel Component
 * Carrusel automático con transiciones elegantes estilo Puroego
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';

interface HeroSlide {
  id: number;
  image: string;
  collection: string;
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonLink: string;
  textPosition?: 'center' | 'left' | 'right';
}

const slides: HeroSlide[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1920&q=80',
    collection: 'SPRING/SUMMER 2026',
    title: 'Elegancia',
    subtitle: 'Redefinida',
    buttonText: 'Ver Colección',
    buttonLink: '/tienda',
    textPosition: 'center',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1920&q=80',
    collection: 'TAILORING COLLECTION',
    title: 'Trajes',
    subtitle: 'de Autor',
    buttonText: 'Explorar Trajes',
    buttonLink: '/categoria/trajes',
    textPosition: 'center',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80',
    collection: 'ESSENTIAL BASICS',
    title: 'Camisas',
    subtitle: 'Premium',
    buttonText: 'Ver Camisas',
    buttonLink: '/categoria/camisas',
    textPosition: 'center',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1920&q=80',
    collection: 'NEW ARRIVALS',
    title: 'Casual',
    subtitle: 'Luxury',
    buttonText: 'Descubrir',
    buttonLink: '/tienda',
    textPosition: 'center',
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 1000);
  }, [isAnimating]);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  // Auto-advance slides
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      nextSlide();
    }, 6000); // Cambiar cada 6 segundos

    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section 
      className="relative h-screen w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images */}
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img
            src={s.image}
            alt={s.title}
            className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${
              index === currentSlide ? 'scale-105' : 'scale-100'
            }`}
          />
          {/* Overlay gradient más oscuro para mejor contraste */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-4">
        {/* Collection label - Vertical text on left */}
        <div 
          className={`absolute left-8 top-1/2 -translate-y-1/2 hidden lg:block transition-all duration-700 ${
            isAnimating ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <span 
            className="text-white/80 text-xs font-medium tracking-[0.4em] uppercase"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            {slide.collection}
          </span>
        </div>

        {/* Main content */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Collection badge - Mobile */}
          <div 
            className={`lg:hidden mb-6 transition-all duration-700 ${
              isAnimating ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium tracking-[0.3em] uppercase">
              {slide.collection}
            </span>
          </div>

          {/* Title */}
          <h1 
            className={`font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light text-white leading-none mb-4 transition-all duration-700 ${
              isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
            }`}
            style={{ 
              transitionDelay: '300ms',
              textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
              fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif"
            }}
          >
            {slide.title}
          </h1>

          {/* Subtitle */}
          {slide.subtitle && (
            <h2 
              className={`font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light italic mb-10 transition-all duration-700 ${
                isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
              }`}
              style={{ 
                transitionDelay: '400ms',
                color: '#f5d998',
                textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)',
                fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif"
              }}
            >
              {slide.subtitle}
            </h2>
          )}

          {/* CTA Button */}
          <div 
            className={`transition-all duration-700 ${
              isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            <a
              href={slide.buttonLink}
              className="inline-flex items-center gap-3 px-10 py-4 border border-white/60 text-white text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:bg-white hover:text-black hover:border-white"
            >
              {slide.buttonText}
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white w-8' 
                : 'bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          >
            {/* Progress indicator for active slide */}
            {index === currentSlide && !isPaused && (
              <span 
                className="absolute inset-0 rounded-full bg-white/30"
                style={{
                  animation: 'progress 6s linear forwards',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={() => {
          if (isAnimating) return;
          setIsAnimating(true);
          setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
          setTimeout(() => setIsAnimating(false), 1000);
        }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300 group"
        aria-label="Anterior"
      >
        <svg className="w-8 h-8 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-300 group"
        aria-label="Siguiente"
      >
        <svg className="w-8 h-8 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 right-10 z-30 hidden md:block">
        <div className="flex flex-col items-center gap-2 text-white/60">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-white/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-scroll-line" />
          </div>
        </div>
      </div>

      {/* CSS Animation for progress */}
      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes scroll-line {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .animate-scroll-line {
          animation: scroll-line 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
