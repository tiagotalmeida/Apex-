import React, { useState } from 'react';
import { findNearbyPlaces } from '../services/geminiService';
import { Coordinate, GroundingChunk } from '../types';
import { RideInfo } from '../App';

interface MapsViewProps {
  currentLocation: Coordinate | null;
  selectedRide: RideInfo | null;
}

const MapsView: React.FC<MapsViewProps> = ({ currentLocation, selectedRide }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [chunks, setChunks] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (overrideQuery?: string) => {
    const activeQuery = overrideQuery || query;
    if (!activeQuery) return;
    if (!currentLocation) {
      alert("Waiting for GPS location...");
      return;
    }

    setLoading(true);
    setResponse(null);
    setChunks([]);

    try {
      // Enrich query with ride info if applicable
      const enrichedQuery = selectedRide 
        ? `${activeQuery} (I have a ${selectedRide.year} ${selectedRide.brand} ${selectedRide.model})`
        : activeQuery;

      const result = await findNearbyPlaces(enrichedQuery, currentLocation.latitude, currentLocation.longitude);
      setResponse(result.text);
      setChunks(result.chunks);
    } catch (e) {
      setResponse("Failed to fetch maps data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto no-scrollbar pb-20">
       <div className="flex justify-between items-start mb-4">
         <div>
           <h2 className="text-2xl font-display text-white">PIT WALL</h2>
           <p className="text-gray-400 text-xs mt-1">Find tracks, services, and mechanics.</p>
         </div>
         {selectedRide && (
           <div className="bg-racing-purple/10 px-3 py-1.5 rounded-lg border border-racing-purple/30 flex items-center space-x-2">
             <div className="w-1.5 h-1.5 bg-racing-purple rounded-full animate-pulse" />
             <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
               {selectedRide.model} Active
             </span>
           </div>
         )}
       </div>

       <div className="flex space-x-2 mb-4">
         <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Find gas stations near me"
          className="flex-grow bg-racing-dark border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-racing-red shadow-inner"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
         />
         <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="bg-racing-red px-4 rounded-lg font-bold text-white disabled:opacity-50 transition-all active:scale-95"
         >
           {loading ? '...' : 'GO'}
         </button>
       </div>

       <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => handleSearch("Nearby Race Tracks")}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-racing-dark border border-gray-800 rounded-full text-gray-400 hover:text-white hover:border-racing-red transition-all"
          >
            🏁 Tracks
          </button>
          <button 
            onClick={() => handleSearch("Motorcycle shops and mechanics")}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-racing-dark border border-gray-800 rounded-full text-gray-400 hover:text-white hover:border-racing-yellow transition-all"
          >
            🔧 Mechanics
          </button>
          <button 
            onClick={() => handleSearch("Gas stations")}
            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-racing-dark border border-gray-800 rounded-full text-gray-400 hover:text-white hover:border-racing-green transition-all"
          >
            ⛽ Fuel
          </button>
          {selectedRide && (
            <button 
              onClick={() => handleSearch(`Specialized parts for ${selectedRide.brand} ${selectedRide.model}`)}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-racing-purple/20 border border-racing-purple/30 rounded-full text-white hover:bg-racing-purple transition-all"
            >
              🚲 {selectedRide.brand} Parts
            </button>
          )}
       </div>

       {loading && (
         <div className="flex flex-col items-center justify-center py-12 space-y-4">
           <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-racing-red"></div>
           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] animate-pulse">Scanning Grid...</span>
         </div>
       )}

       {response && (
         <div className="bg-racing-card rounded-xl p-4 border border-gray-700 space-y-4 shadow-2xl animate-fade-in">
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{response}</p>
            </div>

            {chunks.length > 0 && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-widest">Grounding Sources</h3>
                <div className="space-y-2">
                  {chunks.map((chunk, i) => {
                    const uri = chunk.web?.uri || chunk.maps?.uri;
                    const title = chunk.web?.title || chunk.maps?.title;
                    if (!uri || !title) return null;
                    return (
                      <a key={i} href={uri} target="_blank" rel="noopener noreferrer" className="block bg-black/30 p-3 rounded-lg border border-gray-800 hover:border-racing-yellow hover:bg-black/50 transition-all flex items-center justify-between group">
                         <span className="text-sm text-racing-yellow font-medium truncate mr-2 group-hover:text-white">{title}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-hover:text-racing-yellow flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                         </svg>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
         </div>
       )}
    </div>
  );
};

export default MapsView;