import React, { useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

export const TiltCard = ({ 
  children, 
  className = "", 
  glowColor = "rgba(242,125,38,0.12)",
  intensity = 1 
}: TiltCardProps) => {
  const [coords, setCoords] = useState({ rx: 0, ry: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    // Relative coordinates within the card (0 to width, 0 to height)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Glare position in percentages
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePos({ x: glareX, y: glareY });

    // Pivot calculations (from -width/2 to +width/2)
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Calculate rotation (-10 to +10 degrees limit)
    const rotateY = ((x - xc) / xc) * 8 * intensity; 
    const rotateX = -((y - yc) / yc) * 8 * intensity;

    setCoords({ rx: rotateX, ry: rotateY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ rx: 0, ry: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-300 ease-out preserve-3d overflow-hidden ${className}`}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateX(${coords.rx}deg) rotateY(${coords.ry}deg) scale3d(1.02, 1.02, 1.02)` 
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transformStyle: 'preserve-3d',
        boxShadow: isHovered
          ? `0 20px 40px -15px rgba(0,0,0,0.2), 0 0 35px -5px ${glowColor}`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* 3D Reflection Glare Overlay */}
      {isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 250px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 80%)`,
            mixBlendMode: 'overlay'
          }}
        />
      )}
      
      {/* Inner wrapper to support child translateZ effects */}
      <div className="h-full w-full" style={{ transform: 'translateZ(15px)' }}>
        {children}
      </div>
    </div>
  );
};
