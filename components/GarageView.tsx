import React, { useState, useEffect } from 'react';
import { MOTORCYCLE_DATA, YEARS } from '../data/motorcycles';
import { RideInfo } from '../App';
import SearchableDropdown from './SearchableDropdown';
import { TrashIcon, BikeIcon } from './Icons';

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
    setTimeout(() => setSaved(false), 2000);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <p className="label-sm text-racing-red mb-1">Your Machine</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Garage</h1>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-8 space-y-5">

        {/* Active ride card */}
        {selectedRide ? (
          <div className="relative rounded-3xl overflow-hidden surface-elevated animate-fade-in">
            <div className="absolute inset-0 grad-accent-soft pointer-events-none" />
            <div className="relative px-5 py-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl grad-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-racing-red/30">
                <BikeIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-racing-red mb-0.5">Active</p>
                <p className="text-lg font-black text-white truncate">{selectedRide.brand} {selectedRide.model}</p>
                <p className="text-sm text-slate-400 font-semibold">{selectedRide.year}</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50 flex-shrink-0" />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl surface-card px-5 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center mb-3">
              <BikeIcon className="w-9 h-9 text-slate-500" />
            </div>
            <p className="text-white font-bold text-base mb-1">No machine selected</p>
            <p className="text-sm text-slate-400">Pick your ride to start logging sessions</p>
          </div>
        )}

        {/* Selectors */}
        <div className="rounded-3xl surface-card p-5 space-y-4">
          <div>
            <label className="label-sm block mb-2">Brand</label>
            <SearchableDropdown
              options={Object.keys(MOTORCYCLE_DATA)}
              value={editRide.brand}
              onSelect={(v) => handleChange('brand', v)}
              placeholder="Choose a brand"
            />
          </div>
          <div>
            <label className="label-sm block mb-2">Model</label>
            <SearchableDropdown
              options={models}
              value={editRide.model}
              onSelect={(v) => handleChange('model', v)}
              placeholder={editRide.brand ? 'Choose a model' : 'Select brand first'}
              disabled={!editRide.brand}
            />
          </div>
          <div>
            <label className="label-sm block mb-2">Year</label>
            <SearchableDropdown
              options={YEARS}
              value={editRide.year}
              onSelect={(v) => handleChange('year', v)}
              placeholder="Choose a year"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`flex-grow rounded-2xl py-4 text-[15px] font-bold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed
              ${saved ? 'btn-success' : 'btn-primary'}`}
          >
            {saved ? '✓ Saved' : 'Save Machine'}
          </button>
          {selectedRide && (
            <button
              onClick={handleClear}
              className="rounded-2xl px-5 btn-ghost flex items-center justify-center hover:text-racing-red transition-colors"
              aria-label="Clear machine"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick brand picker */}
        <div>
          <p className="label-sm mb-3 px-1">Quick Select</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MOTORCYCLE_DATA).map(brand => {
              const active = editRide.brand === brand;
              return (
                <button
                  key={brand}
                  onClick={() => handleChange('brand', brand)}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-bold transition-all
                    ${active
                      ? 'btn-primary'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'}`}
                >
                  {brand}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GarageView;
