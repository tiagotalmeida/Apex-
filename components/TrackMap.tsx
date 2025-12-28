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
    const padding = 0.20; // 20% padding for better visibility of markers
    
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
        isMoving: (userLocation.speed || 0) > 1.0 // > 1 m/s (~3.6 km/h) to show direction
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
        {/* The Track Path */}
        <polyline
          points={svgData.points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_2px_rgba(255,255,255,0.1)] opacity-70"
        />
        
        {/* Start/Finish Line Gate Visual */}
        {svgData.sfMarker && (
          <g transform={`translate(${svgData.sfMarker.x}, ${svgData.sfMarker.y})`}>
            {/* Pulsing ring for high visibility */}
            <circle r="6" fill="none" stroke="#FFCC00" strokeWidth="1" className="animate-pulse opacity-40" />
            
            {/* Checkered style core */}
            <rect x="-3" y="-3" width="6" height="6" fill="#000" />
            <rect x="-3" y="-3" width="3" height="3" fill="#FFCC00" />
            <rect x="0" y="0" width="3" height="3" fill="#FFCC00" />
            <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#FFCC00" strokeWidth="0.5" />
            
            {/* Labels for "Finish" */}
            <text y="-8" textAnchor="middle" className="text-[4px] font-bold fill-racing-yellow uppercase tracking-tighter">FINISH</text>
          </g>
        )}

        {/* Live User Position - Directional Arrow or Radar Beacon */}
        {svgData.liveMarker && (
          <g transform={`translate(${svgData.liveMarker.x}, ${svgData.liveMarker.y})`}>
             {/* Dynamic radar ping */}
             <circle r="10" fill="none" stroke="#007AFF" strokeWidth="0.5" className="animate-ping opacity-20" />
             
             <g transform={`rotate(${svgData.liveMarker.heading})`}>
                {svgData.liveMarker.isMoving ? (
                   /* Directional Arrow */
                   <path 
                      d="M 0,-6 L 4,4 L 0,2 L -4,4 Z" 
                      fill="#007AFF" 
                      stroke="white" 
                      strokeWidth="1" 
                      className="drop-shadow-[0_0_3px_rgba(0,122,255,0.5)]"
                   />
                ) : (
                   /* Stationary Beacon */
                   <g>
                      <circle r="4" fill="#007AFF" stroke="white" strokeWidth="1.5" className="drop-shadow-[0_0_3px_rgba(0,122,255,0.8)]" />
                      <circle r="1.5" fill="white" />
                   </g>
                )}
             </g>
          </g>
        )}

        {/* Path Completion / Trailing Point */}
        {showPoints && path.length > 0 && !userLocation && (
           <circle 
              cx={svgData.points.split(' ').pop()?.split(',')[0]} 
              cy={svgData.points.split(' ').pop()?.split(',')[1]} 
              r="2.5" 
              fill="white" 
              stroke="#FF3B30" 
              strokeWidth="1" 
            />
        )}
      </svg>
    </div>
  );
};

export default TrackMap;