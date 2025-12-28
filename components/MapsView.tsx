import React, { useState } from 'react';
import { findNearbyPlaces } from '../services/geminiService';
import { Coordinate, GroundingChunk } from '../types';

interface MapsViewProps {
  currentLocation: Coordinate | null;
}

const MapsView: React.FC<MapsViewProps> = ({ currentLocation }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [chunks, setChunks] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    if (!currentLocation) {
      alert("Waiting for GPS location...");
      return;
    }

    setLoading(true);
    setResponse(null);
    setChunks([]);

    try {
      const result = await findNearbyPlaces(query, currentLocation.latitude, currentLocation.longitude);
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
       <h2 className="text-2xl font-display text-white mb-4">PIT WALL</h2>
       <p className="text-gray-400 mb-6 text-sm">Find nearby tracks, gas stations, or mechanics using real-time Google Maps data.</p>

       <div className="flex space-x-2 mb-6">
         <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Find gas stations near me"
          className="flex-grow bg-racing-dark border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-racing-red"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
         />
         <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-racing-red px-4 rounded-lg font-bold text-white disabled:opacity-50"
         >
           {loading ? '...' : 'GO'}
         </button>
       </div>

       {loading && (
         <div className="flex justify-center py-10">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-racing-red"></div>
         </div>
       )}

       {response && (
         <div className="bg-racing-card rounded-xl p-4 border border-gray-700 space-y-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{response}</p>
            </div>

            {chunks.length > 0 && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Sources</h3>
                <div className="space-y-2">
                  {chunks.map((chunk, i) => {
                    const uri = chunk.web?.uri || chunk.maps?.uri;
                    const title = chunk.web?.title || chunk.maps?.title;
                    if (!uri || !title) return null;
                    return (
                      <a key={i} href={uri} target="_blank" rel="noopener noreferrer" className="block bg-black/30 p-3 rounded hover:bg-black/50 transition-colors flex items-center justify-between">
                         <span className="text-sm text-racing-yellow font-medium truncate mr-2">{title}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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