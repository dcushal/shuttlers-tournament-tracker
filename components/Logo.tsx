
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Fan-out Feathers (Top part of shuttle) */}
        <g stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {/* Main vertical ribs */}
          <path d="M50 80 L50 20" />
          <path d="M40 80 L25 25" />
          <path d="M60 80 L75 25" />
          <path d="M32 80 L12 35" />
          <path d="M68 80 L88 35" />
          
          {/* Feather tops - zigzag fan shape */}
          <path d="M12 35 L18 20 L25 25 L35 15 L45 22 L50 15 L55 22 L65 15 L75 25 L82 20 L88 35" fill="#22c55e" fillOpacity="0.1" />
          
          {/* Support band (The threading) */}
          <path d="M18 55 Q50 45 82 55" strokeWidth="2" opacity="0.8" />
          <path d="M25 70 Q50 62 75 70" strokeWidth="2" opacity="0.8" />
        </g>

        {/* The Cork (Base) */}
        <path 
          d="M30 80 Q30 110 50 110 Q70 110 70 80 Z" 
          fill="#22c55e" 
          stroke="#22c55e" 
          strokeWidth="1" 
        />
        
        {/* Stylized highlight on the cork to give it depth */}
        <path 
          d="M40 95 Q50 102 60 95" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.6" 
        />
        
        {/* Small center star for brand consistency with the original logo */}
        <path 
          d="M50 90 L52 94 L56 94 L53 96 L54 100 L50 98 L46 100 L47 96 L44 94 L48 94 Z" 
          fill="white" 
        />
      </svg>
    </div>
  );
};

export default Logo;
