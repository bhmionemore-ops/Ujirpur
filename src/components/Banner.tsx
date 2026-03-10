import React from 'react';

export const Banner = () => {
  return (
    <div className="relative h-[400px] w-full overflow-hidden">
      <img
        src="https://picsum.photos/seed/nadia-landscape/1920/600"
        alt="Ujirpur Barnia Nadia Banner"
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-center mb-4 drop-shadow-lg">
          Ujirpur Barnia Nadia
        </h1>
        <p className="text-xl md:text-2xl font-light tracking-wide text-center max-w-2xl drop-shadow-md">
          Connecting our community, empowering our voices.
        </p>
      </div>
    </div>
  );
};
