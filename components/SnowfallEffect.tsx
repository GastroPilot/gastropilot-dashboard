'use client';

import Snowfall from 'react-snowfall';

export default function SnowfallEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <Snowfall
        color="white"
        snowflakeCount={100}
        rotationSpeed={[-0.2, 0.2]}
        speed={[0.7, 0.8]}
        wind={[-0.5, 1.0]}
        opacity={[0.5, 0.5]}
      />
    </div>
  );
}
