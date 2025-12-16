import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ComparisonSliderProps {
  originalUrl: string;
  compressedUrl: string | null; // Can be null while processing
  isProcessing: boolean;
  compressedLabel: string;
  originalLabel: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ 
  originalUrl, 
  compressedUrl, 
  isProcessing,
  compressedLabel,
  originalLabel
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage 0-100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const onMouseDown = () => {
    isDragging.current = true;
  };

  const onTouchStart = () => {
    isDragging.current = true;
  };

  useEffect(() => {
    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientX);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current) {
        handleMove(e.touches[0].clientX);
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('touchmove', onTouchMove);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleMove]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-[#1e1e20] overflow-hidden rounded-lg select-none shadow-2xl border border-zinc-800"
    >
      {/* Background (Compressed Image - Right Side effectively) */}
      {compressedUrl && !isProcessing && (
        <img 
          src={compressedUrl} 
          alt="Compressed" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        />
      )}

      {/* Foreground (Original Image - Left Side) */}
      {originalUrl && (
        <div 
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={originalUrl} 
            alt="Original" 
            className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none" 
            // We set width/height 100% of container to match exactly
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      {/* Loading Overlay for Compressed side (Right Side) */}
      {isProcessing && (
        <div 
          className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-xs font-medium text-white">Compressing...</span>
          </div>
        </div>
      )}

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-md pointer-events-none z-20 font-medium shadow-lg border border-blue-500/20">
        {originalLabel}
      </div>
      <div className="absolute top-4 right-4 bg-emerald-600/90 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-md pointer-events-none z-20 font-medium shadow-lg border border-emerald-500/20">
        {compressedLabel}
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute inset-y-0 w-1 bg-indigo-500 hover:bg-indigo-400 z-30 cursor-ew-resize flex items-center justify-center transition-colors"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="w-8 h-8 -ml-3.5 bg-white rounded-full shadow-lg flex items-center justify-center text-indigo-600 hover:scale-110 transition-transform">
          <GripVertical size={16} />
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;