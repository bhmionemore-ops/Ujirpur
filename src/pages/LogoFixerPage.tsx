import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { Upload, Download, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';

export const LogoFixerPage = () => {
  const { language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError(language === 'bn' ? 'দয়া করে একটি ছবি আপলোড করুন।' : 'Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setSelectedImage(event.target?.result as string);
        resizeImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resizeImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to exactly 120x120
    canvas.width = 120;
    canvas.height = 120;

    // Clear canvas
    ctx.clearRect(0, 0, 120, 120);

    // Calculate scaling to maintain aspect ratio while filling the 120x120 square
    const scale = Math.max(120 / img.width, 120 / img.height);
    const x = (120 - img.width * scale) / 2;
    const y = (120 - img.height * scale) / 2;

    // Draw image
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Get data URL
    const dataUrl = canvas.toDataURL('image/png');
    setResizedImage(dataUrl);
    setError(null);
  };

  const downloadImage = () => {
    if (!resizedImage) return;
    const link = document.createElement('a');
    link.download = 'barnia-logo-120x120.png';
    link.href = resizedImage;
    link.click();
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-12 border-4 border-zinc-100 shadow-xl"
        >
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ImageIcon className="text-brand-600" size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">
            {language === 'bn' ? 'লোগো রিসাইজার টুল' : 'Google Logo Fixer'}
          </h1>
          <p className="text-zinc-500 font-medium mb-12">
            {language === 'bn' 
              ? 'গুগল ক্লাউড কনসোলের জন্য আপনার লোগোটি ১২০x১২০ পিক্সেল সাইজে ঠিক করুন।' 
              : 'Resize your logo to exactly 120x120 pixels for Google Cloud Console.'}
          </p>

          <div className="space-y-8">
            {!selectedImage ? (
              <label className="block w-full cursor-pointer group">
                <div className="border-4 border-dashed border-zinc-100 rounded-[2rem] p-12 hover:border-brand-200 hover:bg-brand-50/30 transition-all duration-300">
                  <Upload className="mx-auto text-zinc-300 group-hover:text-brand-500 mb-4 transition-colors" size={48} />
                  <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                    {language === 'bn' ? 'লোগো ফাইলটি এখানে ড্র্যাগ করুন বা ক্লিক করুন' : 'Click or Drag Logo File Here'}
                  </p>
                  <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </div>
              </label>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Original</p>
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-zinc-100 shadow-inner">
                      <img src={selectedImage} alt="Original" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                    <CheckCircle className="text-emerald-500" size={20} />
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Fixed (120x120)</p>
                    <div className="w-[120px] h-[120px] rounded-none overflow-hidden border-4 border-brand-500 shadow-lg">
                      <img src={resizedImage!} alt="Resized" className="w-full h-full" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-8 py-4 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-sm hover:bg-zinc-200 transition-all"
                  >
                    {language === 'bn' ? 'অন্য ছবি বেছে নিন' : 'Choose Another'}
                  </button>
                  <button
                    onClick={downloadImage}
                    className="px-8 py-4 rounded-2xl bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    {language === 'bn' ? 'ফিক্সড লোগো ডাউনলোড করুন' : 'Download Fixed Logo'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 justify-center font-bold text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>

        <div className="mt-12 p-8 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 text-left">
          <h3 className="text-emerald-900 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle size={16} />
            Next Steps
          </h3>
          <ul className="text-emerald-800 text-sm space-y-3 font-medium">
            <li>1. Download the fixed logo using the button above.</li>
            <li>2. Go to your <strong>Google Cloud Console</strong> branding page.</li>
            <li>3. Upload the new file (it is exactly 120x120 pixels).</li>
            <li>4. Click <strong>Save and Continue</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
