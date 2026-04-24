import React, { useState, useEffect } from 'react';
import { MOTORCYCLE_DATA, YEARS } from '../data/motorcycles';
import { RideInfo } from '../App';
import SearchableDropdown from './SearchableDropdown';

interface GarageViewProps {
  selectedRide: RideInfo | null;
  setSelectedRide: (ride: RideInfo | null) => void;
}

const GarageView: React.FC<GarageViewProps> = ({ selectedRide, setSelectedRide }) => {
  const [editRide, setEditRide] = useState<RideInfo>({
    brand: selectedRide?.brand || '',
    model: selectedRide?.model || '',
    year:  selectedRide?.year  || '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (selectedRide) setEditRide(selectedRide);
  }, [selectedRide]);

  const handleChange = (field: keyof RideInfo, value: string) => {
    setEditRide(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'brand') next.model = '';
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (!editRide.brand || !editRide.model || !editRide.year) return;
    setSelectedRide(editRide);
    localStorage.setItem('apex_garage_ride', JSON.stringify(editRide));
    setSaved(true);
  };

  const handleClear = () => {
    setSelectedRide(null);
    localStorage.removeItem('apex_garage_ride');
    setEditRide({ brand: '', model: '', year: '' });
    setSaved(false);
  };

  const models = editRide.brand ? MOTORCYCLE_DATA[editRide.brand] ?? [] : [];
  const canSave = editRide.brand && editRide.model && editRide.year;

  return (
    <div className="flex flex-col h-full bg-racing-dark">
      {/* Header */}
      <div className="h-[3px] bg-gradient-to-r from-racing-red via-racing-orange to-transparent" />
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <p className="text-[9px] font-black tracking-[0.25em] text-racing-red uppercase">Machine</p>
        <h2 className="text-lg font-display text-white uppercase italic leading-none">Garage</h2>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-4 py-6 space-y-6">

        {/* Active ride badge */}
        {selectedRide && (
          <div className="carbon border border-racing-red/30 px-4 py-3 flex items-center justify-between animate-fade-in">
            <div>
              <p className="text-[8px] font-black text-racing-red uppercase tracking-widest mb-0.5">Active Machine</p>
              <p className="text-base font-black text-white uppercase tracking-tight">
                {selectedRide.year} {selectedRide.brand} {selectedRide.model}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-racing-green animate-pulse" />
          </div>
        )}

        {/* Bike selector */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 bg-racing-red" />
            <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">Select Your Ride</span>
          </div>

          <div className="space-y-2 carbon p-4 border border-white/5">
            <div>
              <p className="data-label mb-1">Brand</p>
              <SearchableDropdown
                options={Object.keys(MOTORCYCLE_DATA)}
                value={editRide.brand}
                onSelect={(v) => handleChange('brand', v)}
                placeholder="Select brand"
              />
            </div>
            <div>
              <p className="data-label mb-1">Model</p>
              <SearchableDropdown
                options={models}
                value={editRide.model}
                onSelect={(v) => handleChange('model', v)}
                placeholder="Select model"
                disabled={!editRide.brand}
              />
            </div>
            <div>
              <p className="data-label mb-1">Year</p>
              <SearchableDropdown
                options={YEARS}
                value={editRide.year}
                onSelect={(v) => handleChange('year', v)}
                placeholder="Select year"
              />
            </div>
          </div>
        </section>

        {/* Save / Clear */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`cut-corner-lg flex-grow py-4 font-black text-sm uppercase tracking-[0.2em] transition-all active:opacity-80 disabled:opacity-30
              ${saved ? 'bg-racing-green text-black' : 'bg-racing-red text-white'}`}
          >
            {saved ? '✓ Saved' : 'Save Machine'}
          </button>
          {selectedRide && (
            <button
              onClick={handleClear}
              className="carbon border border-white/10 px-5 py-4 text-gray-400 hover:text-racing-red hover:border-racing-red transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Supported brands list */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 bg-white/20" />
            <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">Supported Brands</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MOTORCYCLE_DATA).map(brand => (
              <button
                key={brand}
                onClick={() => handleChange('brand', brand)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-colors
                  ${editRide.brand === brand
                    ? 'bg-racing-red border-racing-red text-white'
                    : 'carbon border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
              >
                {brand}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default GarageView;
