
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`${className} relative flex items-center justify-center overflow-hidden rounded-xl`}>
      <img
        src="/logo.jpg"
        alt="8:30 Shuttlers Logo"
        className="w-full h-full object-contain scale-[1.6]"
      />
    </div>
  );
};

export default Logo;
