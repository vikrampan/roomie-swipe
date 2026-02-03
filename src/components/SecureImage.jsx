import React, { useEffect, useRef } from 'react';

export const SecureImage = ({ src, className, isBlurred = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    
    // This must match your CORS origin settings to work
    img.crossOrigin = "anonymous"; 
    img.src = src;

    img.onload = () => {
      // Set canvas internal resolution to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply blur filter if locked
      if (isBlurred) {
        ctx.filter = 'blur(60px) brightness(0.8)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(img, 0, 0);
    };
  }, [src, isBlurred]);

  return (
    <div className={`${className} overflow-hidden flex items-center justify-center bg-[#111]`}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover pointer-events-none select-none"
        onContextMenu={(e) => e.preventDefault()} 
      />
    </div>
  );
};