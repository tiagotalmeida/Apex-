import React, { useState } from 'react';
import { editImageWithGemini } from '../services/geminiService';

const GarageView: React.FC = () => {
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
        const result = await editImageWithGemini(base64String, selectedFile.type, prompt);
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

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto no-scrollbar pb-20">
      <h2 className="text-2xl font-display text-white mb-4">AI GARAGE</h2>
      <p className="text-gray-400 mb-6 text-sm">Use Gemini 2.5 Flash to modify your track photos. Try "Add a retro filter" or "Make it look like night time".</p>

      <div className="space-y-6">
        {/* Upload Area */}
        <div className="relative w-full aspect-video bg-racing-card rounded-xl border border-gray-700 border-dashed flex flex-col items-center justify-center overflow-hidden group">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-400 text-sm">Tap to upload photo</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-gray-500">Edit Instruction</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Remove the cones from the track..."
            className="w-full bg-racing-dark border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-racing-red transition-colors text-sm"
            rows={3}
          />
        </div>

        <button
          onClick={handleEdit}
          disabled={!selectedFile || !prompt || isProcessing}
          className={`w-full py-3 rounded-lg font-bold text-black font-display uppercase tracking-wider transition-all ${
            !selectedFile || !prompt || isProcessing
              ? 'bg-gray-700 cursor-not-allowed text-gray-500'
              : 'bg-racing-yellow hover:bg-yellow-400'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Tuning...
            </span>
          ) : (
            'Generate Edit'
          )}
        </button>

        {/* Result Area */}
        {resultImage && (
          <div className="space-y-2 animate-fade-in pb-10">
             <label className="text-xs uppercase font-bold text-racing-green">Result</label>
            <div className="w-full aspect-video bg-black rounded-xl border border-racing-green overflow-hidden relative">
              <img src={resultImage} alt="Edited Result" className="w-full h-full object-contain" />
              <a href={resultImage} download="apex_edit.png" className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-white/20">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GarageView;