import React, { useMemo } from 'react';
import { Coordinate } from '../types';

interface TrackMapProps {
  path: Coordinate[];
  startFinishLine?: Coordinate | null;
  userLocation?: Coordinate | null;
  className?: string;
  strokeColor?: string;
  showPoints?: boolean;
}

const TrackMap: React.FC<TrackMapProps> = ({ 
  path, 
  startFinishLine, 
  userLocation,
  className = "", 
  strokeColor = "#FF3B30",
  showPoints = false
}) => {
  const svgData = useMemo(() => {
    if (path.length < 2 && !userLocation) return null;

    // Find bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    const includeInBounds = (c: Coordinate) => {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
    };

    path.forEach(includeInBounds);
    if (userLocation) includeInBounds(userLocation);
    if (startFinishLine) includeInBounds(startFinishLine);

    // Padding
    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;
    const padding = 0.25; // Increased padding for better visibility of prominent markers
    
    const normalizedMinLat = minLat - latRange * padding;
    const normalizedMaxLat = maxLat + latRange * padding;
    const normalizedMinLon = minLon - lonRange * padding;
    const normalizedMaxLon = maxLon + lonRange * padding;
    
    const finalLatRange = normalizedMaxLat - normalizedMinLat;
    const finalLonRange = normalizedMaxLon - normalizedMinLon;

    const getSvgCoords = (c: Coordinate) => ({
      x: ((c.longitude - normalizedMinLon) / finalLonRange) * 100,
      y: 100 - ((c.latitude - normalizedMinLat) / finalLatRange) * 100
    });

    // Create polyline points for SVG (0-100 scale)
    const points = path.map(c => {
      const coords = getSvgCoords(c);
      return `${coords.x.toFixed(2)},${coords.y.toFixed(2)}`;
    }).join(' ');

    // Handle Start/Finish Marker
    let sfMarker = null;
    if (startFinishLine) {
      sfMarker = getSvgCoords(startFinishLine);
    }

    // Handle User Marker
    let liveMarker = null;
    if (userLocation) {
      liveMarker = {
        ...getSvgCoords(userLocation),
        heading: userLocation.heading || 0,
        isMoving: (userLocation.speed || 0) > 0.8 // Lower threshold for better directional feedback
      };
    }

    return { points, sfMarker, liveMarker };
  }, [path, startFinishLine, userLocation]);

  if (!svgData) {
    return (
      <div className={`flex items-center justify-center text-gray-600 text-xs italic ${className}`}>
        Insufficient data for map
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="sf-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* The Track Path */}
        <polyline
          points={svgData.points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50 drop-shadow-[0_0_1px_rgba(255,255,255,0.2)]"
        />
        
        {/* Start/Finish Line Marker */}
        {svgData.sfMarker && (
          <g transform={`translate(${svgData.sfMarker.x}, ${svgData.sfMarker.y})`}>
            {/* Outer halo */}
            <circle r="8" fill="none" stroke="#FFCC00" strokeWidth="0.5" className="animate-pulse opacity-30" />
            
            {/* Checkered Gate Icon */}
            <g filter="url(#sf-glow)">
              <rect x="-4" y="-4" width="8" height="8" fill="#000" stroke="#FFCC00" strokeWidth="0.5" />
              <rect x="-4" y="-4" width="4" height="4" fill="#FFCC00" />
              <rect x="0" y="0" width="4" height="4" fill="#FFCC00" />
            </g>
            
            {/* Tag label */}
            <g transform="translate(0, -10)">
              <rect x="-8" y="-4" width="16" height="5" rx="1" fill="#000" className="opacity-80" />
              <text textAnchor="middle" y="0" className="text-[3.5px] font-black fill-racing-yellow uppercase tracking-widest">GATE</text>
            </g>
          </g>
        )}

        {/* Live User Position Marker */}
        {svgData.liveMarker && (
          <g transform={`translate(${svgData.liveMarker.x}, ${svgData.liveMarker.y})`}>
             {/* Large pulsing radar wave */}
             <circle r="12" fill="none" stroke="#007AFF" strokeWidth="0.4" className="animate-ping opacity-20" />
             
             <g transform={`rotate(${svgData.liveMarker.heading})`} filter="url(#marker-glow)">
                {svgData.liveMarker.isMoving ? (
                   /* High-visibility directional arrow */
                   <g>
                     <path 
                        d="M 0,-8 L 6,6 L 0,2 L -6,6 Z" 
                        fill="#007AFF" 
                        stroke="#fff" 
                        strokeWidth="1.2" 
                        strokeLinejoin="round"
                     />
                     <path d="M 0,-4 L 0,0" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                   </g>
                ) : (
                   /* Prominent stationary beacon */
                   <g>
                      <circle r="6" fill="#007AFF" stroke="#fff" strokeWidth="1.5" className="drop-shadow-lg" />
                      <circle r="2" fill="#fff" className="animate-pulse" />
                   </g>
                )}
             </g>
          </g>
        )}

        {/* Path Completion Icon (Tail) */}
        {showPoints && path.length > 0 && !userLocation && (
           <circle 
              cx={svgData.points.split(' ').pop()?.split(',')[0]} 
              cy={svgData.points.split(' ').pop()?.split(',')[1]} 
              r="3" 
              fill="#fff" 
              stroke="#FF3B30" 
              strokeWidth="1.5" 
            />
        )}
      </svg>
    </div>
  );
};

export default TrackMap;