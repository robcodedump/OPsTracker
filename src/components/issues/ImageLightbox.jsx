import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImageLightbox({ images, currentIndex, onClose, onNavigate }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <Button
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white"
        size="icon"
      >
        <X className="w-5 h-5" />
      </Button>

      {currentIndex > 0 && (
        <Button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white"
          size="icon"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      <div className="max-w-6xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />
        <div className="text-white mt-4 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {currentIndex < images.length - 1 && (
        <Button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white"
          size="icon"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}