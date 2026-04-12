
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`${className} relative flex items-center justify-center`}>
      <img
        src="/logo.png"
        alt="8:30 Shuttlers Logo"
        className="w-full h-full object-contain scale-[1.6]"
      />
    </div>
  );
};

export default Logo;
