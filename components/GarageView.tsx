import React, { useState, useEffect } from 'react';
import { editImageWithGemini } from '../services/geminiService';
import { MOTORCYCLE_DATA, YEARS } from '../data/motorcycles';
import { RideInfo } from '../App';
import SearchableDropdown from './SearchableDropdown';

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Local editing state for the ride
  const [editRide, setEditRide] = useState<RideInfo>({
    brand: selectedRide?.brand || '',
    model: selectedRide?.model || '',
    year: selectedRide?.year || ''
  });

  useEffect(() => {
    if (selectedRide) {
      setEditRide(selectedRide);
    }
  }, [selectedRide]);

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

  const handleFieldChange = (field: keyof RideInfo, value: string) => {
    setEditRide(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'brand') updated.model = ''; // Reset model on brand change
      return updated;
    });
    setSaveStatus('idle');
  };

  const saveToGarage = () => {
    if (!editRide.brand || !editRide.model || !editRide.year) {
      alert("Please select Brand, Model, and Year first.");
      return;
    }
    setSaveStatus('saving');
    // Global State
    setSelectedRide(editRide);
    // Local Storage
    localStorage.setItem('apex_garage_ride', JSON.stringify(editRide));
    
    setTimeout(() => {
      setSaveStatus('saved');
    }, 400);
  };

  const availableModels = editRide.brand ? MOTORCYCLE_DATA[editRide.brand] : [];

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
        <section className="bg-racing-card rounded-xl border border-gray-700 p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-racing-yellow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Identify Your Ride</h3>
            </div>
            {saveStatus === 'saved' && (
              <span className="text-[10px] text-racing-green font-black uppercase tracking-widest animate-fade-in flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Saved to Garage
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Brand</label>
              <SearchableDropdown
                options={Object.keys(MOTORCYCLE_DATA)}
                value={editRide.brand}
                onSelect={(val) => handleFieldChange('brand', val)}
                placeholder="Select Brand"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Model</label>
              <SearchableDropdown
                options={availableModels}
                value={editRide.model}
                onSelect={(val) => handleFieldChange('model', val)}
                placeholder="Select Model"
                disabled={!editRide.brand}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Year</label>
              <SearchableDropdown
                options={YEARS}
                value={editRide.year}
                onSelect={(val) => handleFieldChange('year', val)}
                placeholder="Select Year"
              />
            </div>
          </div>
          
          <div className="pt-2 flex space-x-3">
             <button 
                onClick={saveToGarage}
                disabled={saveStatus === 'saving' || !editRide.brand || !editRide.model || !editRide.year}
                className={`flex-grow py-3 rounded-lg font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center ${
                  saveStatus === 'saved' ? 'bg-racing-green text-black' : 'bg-racing-yellow text-black hover:bg-yellow-400 active:scale-[0.98]'
                } disabled:opacity-30`}
             >
                {saveStatus === 'saving' ? 'Persisting...' : saveStatus === 'saved' ? 'Machine Updated' : 'Save My Ride'}
             </button>
             {selectedRide && (
                <button 
                  onClick={() => {
                    setSelectedRide(null);
                    localStorage.removeItem('apex_garage_ride');
                    setEditRide({brand:'', model:'', year:''});
                    setSaveStatus('idle');
                  }}
                  className="px-4 py-3 bg-gray-800 text-gray-400 hover:text-racing-red rounded-lg transition-colors border border-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </button>
             )}
          </div>
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