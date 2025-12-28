import React, { useState } from 'react';
import { editImageWithGemini } from '../services/geminiService';
import { MOTORCYCLE_DATA, YEARS } from '../data/motorcycles';
import { RideInfo } from '../App';

interface GarageViewProps {
  selectedRide: RideInfo | null;
  setSelectedRide: (ride: RideInfo | null) => void;
}

const GarageView: React.FC<GarageViewProps> = ({ selectedRide, setSelectedRide }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResultImage(null);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !prompt) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        // Enrich prompt with vehicle context
        const bikeContext = selectedRide
          ? `This is a ${selectedRide.year} ${selectedRide.brand} ${selectedRide.model}. ` 
          : "";
        const fullPrompt = `${bikeContext}${prompt}`;
        
        const result = await editImageWithGemini(base64String, selectedFile.type, fullPrompt);
        if (result.imageUrl) {
          setResultImage(result.imageUrl);
        } else {
          alert('No image generated, but model said: ' + result.text);
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      alert('Failed to process image.');
    }
  };

  const handleRideChange = (field: keyof RideInfo, value: string) => {
    const newRide = selectedRide ? { ...selectedRide, [field]: value } : { brand: '', model: '', year: '', [field]: value };
    
    // Reset model if brand changes
    if (field === 'brand') {
      newRide.model = '';
    }
    
    setSelectedRide(newRide);
  };

  const availableModels = selectedRide?.brand ? MOTORCYCLE_DATA[selectedRide.brand] : [];

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto no-scrollbar pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-display text-white italic">AI GARAGE</h2>
          <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">Machine Customization</p>
        </div>
        <div className="bg-racing-yellow/10 px-3 py-1 rounded border border-racing-yellow/30">
          <span className="text-[10px] font-black text-racing-yellow uppercase tracking-tighter">Nano Banana Powered</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ride Selection Section */}
        <section className="bg-racing-card rounded-xl border border-gray-700 p-4 space-y-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-racing-yellow" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Identify Your Ride</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Brand</label>
              <select 
                value={selectedRide?.brand || ''} 
                onChange={(e) => handleRideChange('brand', e.target.value)}
                className="w-full bg-racing-dark border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-racing-yellow transition-colors text-sm appearance-none cursor-pointer"
              >
                <option value="">Select Brand</option>
                {Object.keys(MOTORCYCLE_DATA).map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Model</label>
              <select 
                value={selectedRide?.model || ''} 
                disabled={!selectedRide?.brand}
                onChange={(e) => handleRideChange('model', e.target.value)}
                className="w-full bg-racing-dark border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-racing-yellow transition-colors text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedRide?.brand ? "Select Model" : "Select Brand First"}</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Year</label>
              <select 
                value={selectedRide?.year || ''} 
                onChange={(e) => handleRideChange('year', e.target.value)}
                className="w-full bg-racing-dark border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-racing-yellow transition-colors text-sm appearance-none cursor-pointer"
              >
                <option value="">Select Year</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedRide?.brand && selectedRide?.model && (
             <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => {
                    setSelectedRide(null);
                    localStorage.removeItem('apex_garage_ride');
                  }}
                  className="text-[9px] text-gray-500 hover:text-racing-red font-bold uppercase tracking-widest transition-colors"
                >
                  Clear My Ride
                </button>
             </div>
          )}
        </section>

        {/* Upload Area */}
        <div className="relative w-full aspect-video bg-racing-card rounded-xl border-2 border-gray-700 border-dashed flex flex-col items-center justify-center overflow-hidden group hover:border-racing-red transition-all cursor-pointer">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 mx-auto mb-3 group-hover:text-racing-red transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Tap to Upload Track Shot</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {previewUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-white font-bold text-xs uppercase tracking-[0.2em] bg-black/60 px-4 py-2 rounded-full border border-white/20">Change Photo</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Customization Instructions</label>
            {selectedRide?.brand && selectedRide?.model && (
              <span className="text-[9px] text-racing-yellow font-bold uppercase animate-pulse">Context Active: {selectedRide.brand} {selectedRide.model}</span>
            )}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Apply a carbon fiber texture to the fairings' or 'Add motion blur to the background'..."
            className="w-full bg-racing-dark border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-racing-red transition-colors text-sm shadow-inner"
            rows={4}
          />
        </div>

        <button
          onClick={handleEdit}
          disabled={!selectedFile || !prompt || isProcessing}
          className={`w-full py-4 rounded-xl font-display text-lg uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
            !selectedFile || !prompt || isProcessing
              ? 'bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700'
              : 'bg-racing-red hover:bg-red-500 text-white shadow-racing-red/20'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Simulating Customization...
            </span>
          ) : (
            'Generate Edit'
          )}
        </button>

        {/* Result Area */}
        {resultImage && (
          <div className="space-y-3 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-racing-green flex items-center">
                <span className="w-1.5 h-1.5 bg-racing-green rounded-full mr-2 animate-pulse" />
                Render Complete
              </label>
              <button onClick={() => setResultImage(null)} className="text-[9px] text-gray-500 hover:text-white uppercase font-bold transition-colors">Dismiss</button>
            </div>
            <div className="w-full aspect-video bg-black rounded-xl border border-racing-green/50 overflow-hidden relative shadow-2xl group">
              <img src={resultImage} alt="Edited Result" className="w-full h-full object-contain" />
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <a 
                  href={resultImage} 
                  download={`apex_${selectedRide?.brand || 'custom'}_${Date.now()}.png`} 
                  className="bg-black/70 backdrop-blur-md text-white p-3 rounded-full hover:bg-racing-green hover:text-black transition-all border border-white/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GarageView;