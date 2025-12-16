import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Zap, 
  Sliders, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Image as ImageIcon,
  CheckCircle2,
  X,
  ChevronDown,
  Settings,
  Minimize2
} from 'lucide-react';
import { AppMode, ImageState, CompressionResult, EditorSettings } from './types';
import { fileToDataUri, loadImage, compressToWebP, formatBytes, downloadBlob } from './utils/image';
import { translations, languages, Language } from './utils/translations';
import ComparisonSlider from './components/ComparisonSlider';

// --- Sub Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled }: any) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    ghost: "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 flex items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-500' : 'bg-zinc-700'}`}
  >
    <div 
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} 
    />
  </button>
);

// Language Dropdown Component
const LanguageSelector = ({ currentLang, onSelect }: { currentLang: Language, onSelect: (l: Language) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLanguage = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors text-sm text-zinc-300"
      >
        <span className="text-lg leading-none">{selectedLanguage.flag}</span>
        <span className="hidden sm:inline">{selectedLanguage.name}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50 overflow-hidden animate-fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onSelect(lang.code as Language);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-zinc-800 transition-colors ${currentLang === lang.code ? 'bg-zinc-800/50 text-white' : 'text-zinc-400'}`}
            >
              <span className="text-lg leading-none">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  // State initialization with localStorage check
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('pixelLiteLanguage');
    return (saved as Language) || 'en';
  });

  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Quick Mode State
  const [quickProcessing, setQuickProcessing] = useState(false);
  const [quickResult, setQuickResult] = useState<CompressionResult | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Editor Mode State
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    quality: 80,
    resize: false,
    width: 0,
    height: 0,
    maintainAspectRatio: true
  });
  
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [compressedInfo, setCompressedInfo] = useState<{size: number, blob: Blob} | null>(null);
  const [isEditorProcessing, setIsEditorProcessing] = useState(false);

  // Translation Helper
  const t = translations[lang];

  // Update LocalStorage when lang changes
  useEffect(() => {
    localStorage.setItem('pixelLiteLanguage', lang);
  }, [lang]);

  // --- Handlers ---

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(t.errorFileType);
      return;
    }

    try {
      const dataUri = await fileToDataUri(file);
      const img = await loadImage(dataUri);

      const newImageState: ImageState = {
        file,
        previewUrl: dataUri,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size
      };

      setImageState(newImageState);
      
      // Reset settings for new image
      setEditorSettings({
        quality: 80,
        resize: false,
        width: img.naturalWidth,
        height: img.naturalHeight,
        maintainAspectRatio: true
      });

      if (mode === AppMode.QUICK) {
        processQuickConvert(img, file);
      } else if (mode === AppMode.EDITOR) {
        // Trigger initial preview generation
        // Wait a tick for state update
        setTimeout(() => processEditorPreview(img, 80, img.naturalWidth, img.naturalHeight), 0);
      }
    } catch (e) {
      console.error(e);
      alert(t.errorImageLoad);
    }
  }, [mode, t]);

  // Quick Convert Logic
  const processQuickConvert = async (img: HTMLImageElement, originalFile: File) => {
    setQuickProcessing(true);
    setQuickResult(null);
    setShowToast(false);
    
    setTimeout(async () => {
      try {
        const qualityVal = 0.8;
        const blob = await compressToWebP(img, { quality: qualityVal });
        const savings = ((originalFile.size - blob.size) / originalFile.size) * 100;
        
        const result: CompressionResult = {
          originalSize: originalFile.size,
          compressedSize: blob.size,
          blob,
          savings: Math.max(0, parseFloat(savings.toFixed(1))),
          fileName: originalFile.name
        };

        setQuickResult(result);
        downloadBlob(blob, originalFile.name);
        setQuickProcessing(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);

      } catch (e) {
        console.error(e);
        setQuickProcessing(false);
        alert(t.errorCompression);
      }
    }, 600);
  };

  // Editor Preview Logic
  const processEditorPreview = useCallback(async (img: HTMLImageElement | null, quality: number, width: number, height: number) => {
    if (!img) return;
    setIsEditorProcessing(true);
    
    try {
      const blob = await compressToWebP(img, { 
        quality: quality / 100,
        width: width,
        height: height
      });
      const url = URL.createObjectURL(blob);
      
      setCompressedPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      
      setCompressedInfo({
        size: blob.size,
        blob: blob
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsEditorProcessing(false);
    }
  }, []);

  // Watch for settings changes in Editor
  useEffect(() => {
    if (mode === AppMode.EDITOR && imageState && !isDragging) {
      const timer = setTimeout(async () => {
        const img = await loadImage(imageState.previewUrl!);
        // Determine target width/height based on Resize Toggle
        const targetWidth = editorSettings.resize ? editorSettings.width : imageState.width;
        const targetHeight = editorSettings.resize ? editorSettings.height : imageState.height;
        
        processEditorPreview(img, editorSettings.quality, targetWidth, targetHeight);
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    }
  }, [editorSettings, imageState, mode, processEditorPreview]);

  // Dimension Handlers
  const handleWidthChange = (val: number) => {
    if (!imageState) return;
    const newWidth = Math.max(1, val);
    let newHeight = editorSettings.height;
    
    if (editorSettings.maintainAspectRatio) {
      const ratio = imageState.height / imageState.width;
      newHeight = Math.round(newWidth * ratio);
    }
    setEditorSettings(prev => ({ ...prev, width: newWidth, height: newHeight }));
  };

  const handleHeightChange = (val: number) => {
    if (!imageState) return;
    const newHeight = Math.max(1, val);
    let newWidth = editorSettings.width;

    if (editorSettings.maintainAspectRatio) {
      const ratio = imageState.width / imageState.height;
      newWidth = Math.round(newHeight * ratio);
    }
    setEditorSettings(prev => ({ ...prev, width: newWidth, height: newHeight }));
  };


  // Drag & Drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // --- Renderers ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-4xl mx-auto px-4 animate-fade-in">
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          {t.title}
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
          {t.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Quick Option */}
        <div 
          onClick={() => setMode(AppMode.QUICK)}
          className="group relative bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Zap className="text-indigo-500" />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Zap size={32} />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">{t.quickModeTitle}</h3>
            <p className="text-zinc-400 text-sm">
              {t.quickModeDesc}
            </p>
          </div>
        </div>

        {/* Editor Option */}
        <div 
          onClick={() => setMode(AppMode.EDITOR)}
          className="group relative bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Sliders className="text-indigo-500" />
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Sliders size={32} />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">{t.editorModeTitle}</h3>
            <p className="text-zinc-400 text-sm">
              {t.editorModeDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDropZone = (content: React.ReactNode) => (
    <div 
      className={`w-full flex-1 flex flex-col relative transition-all duration-300 ${isDragging ? 'scale-[1.02] ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input 
        type="file" 
        className="hidden" 
        id="fileInput" 
        accept="image/*" 
        onChange={handleInputChange} 
      />
      
      {!imageState ? (
        <label 
          htmlFor="fileInput"
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/50 transition-all cursor-pointer m-4"
        >
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <UploadCloud size={40} className="text-zinc-400" />
          </div>
          <p className="text-xl font-medium text-white mb-2">{t.dropZoneDefault}</p>
          <p className="text-zinc-500">{t.dropZoneSub}</p>
        </label>
      ) : (
        <div className="w-full h-full flex flex-col flex-1">
          {content}
        </div>
      )}
    </div>
  );

  const renderQuickMode = () => (
    <div className="w-full max-w-2xl mx-auto h-[60vh] flex flex-col animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => { setImageState(null); setMode(AppMode.HOME); }} icon={ArrowLeft}>
          {t.back}
        </Button>
        <span className="text-indigo-400 font-medium tracking-wider text-sm uppercase">{t.quickModeHeader}</span>
      </div>

      {renderDropZone(
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
           
           {/* Success Overlay */}
           {showToast && quickResult && (
             <div className="absolute top-0 left-0 w-full bg-emerald-600/90 text-white p-4 flex items-center justify-center gap-2 backdrop-blur-md animate-slide-up z-20">
               <CheckCircle2 size={20} />
               <span className="font-medium">
                 {t.successMessage
                   .replace('{savings}', quickResult.savings.toString())
                   .replace('{fileName}', quickResult.fileName)
                 }
               </span>
             </div>
           )}

           {quickProcessing ? (
             <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-medium text-white">{t.compressing}</h3>
                <p className="text-zinc-500 mt-2">{t.compressingSub}</p>
             </div>
           ) : quickResult ? (
             <div className="flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle2 size={40} />
               </div>
               <h3 className="text-2xl font-bold text-white mb-2">{t.allDone}</h3>
               <p className="text-zinc-400 mb-6 max-w-sm">
                 {t.squashed
                    .replace('{originalSize}', formatBytes(quickResult.originalSize))
                    .replace('{compressedSize}', formatBytes(quickResult.compressedSize))
                 }
               </p>
               <Button onClick={() => setImageState(null)} variant="secondary">
                 {t.convertAnother}
               </Button>
             </div>
           ) : (
             <div className="text-zinc-500">{t.processing}</div>
           )}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col animate-slide-up px-4">
       <div className="flex items-center justify-between py-4">
        <Button variant="ghost" onClick={() => { setImageState(null); setMode(AppMode.HOME); }} icon={ArrowLeft}>
          {t.back}
        </Button>
        <div className="flex items-center gap-4">
          <Button 
             variant="primary" 
             icon={Download} 
             onClick={() => compressedInfo && imageState && downloadBlob(compressedInfo.blob, imageState.name)}
             disabled={!compressedInfo}
          >
            {t.download}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 pb-6">
        
        {/* Main Canvas Area */}
        <div className="lg:col-span-3 h-full min-h-[500px] flex flex-col bg-[#1e1e20] rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
           {renderDropZone(
              imageState && (
                <ComparisonSlider 
                  originalUrl={imageState.previewUrl!} 
                  compressedUrl={compressedPreview} 
                  isProcessing={isEditorProcessing}
                  compressedLabel={t.compressedLabel}
                  originalLabel={t.originalLabel}
                />
              )
           )}
        </div>

        {/* Controls Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Edit Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-[#5cacf7] px-4 py-2 flex items-center justify-between">
              <span className="font-semibold text-black text-sm">{t.editTitle}</span>
              <div className="flex gap-2">
                 <Settings size={14} className="text-black/60" />
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">{t.resizeTitle}</span>
                <Toggle 
                  checked={editorSettings.resize} 
                  onChange={(v) => setEditorSettings(s => ({...s, resize: v}))} 
                />
              </div>

              {editorSettings.resize && (
                 <div className="space-y-3 animate-slide-up pt-2">
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">{t.width}</label>
                        <input 
                           type="number" 
                           value={editorSettings.width} 
                           onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">{t.height}</label>
                        <input 
                           type="number" 
                           value={editorSettings.height} 
                           onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                   </div>
                   <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        id="aspect"
                        checked={editorSettings.maintainAspectRatio}
                        onChange={(e) => setEditorSettings(s => ({...s, maintainAspectRatio: e.target.checked}))}
                        className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      <label htmlFor="aspect" className="text-xs text-zinc-400 cursor-pointer select-none">
                        {t.maintainAspectRatio}
                      </label>
                   </div>
                 </div>
              )}
            </div>
          </div>

          {/* Compress Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
             <div className="bg-[#5cacf7] px-4 py-2 flex items-center justify-between">
              <span className="font-semibold text-black text-sm">{t.compressTitle}</span>
            </div>
            
            <div className="p-4 space-y-6">
               <div>
                  <div className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 flex justify-between items-center mb-4">
                     <span>{t.outputFormat}</span>
                     <ChevronDown size={14} className="text-zinc-500" />
                  </div>
               </div>

               <div>
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-300">{t.quality}</span>
                    <span className="text-xs text-indigo-400 font-bold">{editorSettings.quality}</span>
                 </div>
                 <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={editorSettings.quality} 
                    onChange={(e) => setEditorSettings(s => ({...s, quality: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between mt-1">
                     <span className="text-[10px] text-zinc-600">0</span>
                     <span className="text-[10px] text-zinc-600">100</span>
                  </div>
               </div>
            </div>
          </div>
          
          {/* Details Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg mt-auto">
             <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">{t.details}</h3>
             
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t.originalSize}</span>
                  <span className="text-zinc-300 font-mono">{imageState ? formatBytes(imageState.size) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t.newSize}</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {compressedInfo ? formatBytes(compressedInfo.size) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t.dimensions}</span>
                  <span className="text-zinc-300 font-mono">
                     {editorSettings.resize 
                        ? `${editorSettings.width} x ${editorSettings.height}`
                        : (imageState ? `${imageState.width} x ${imageState.height}` : '-')
                     }
                  </span>
                </div>
             </div>

             {/* Prominent Savings Display */}
             <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400 font-medium">{t.savings}</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {compressedInfo && imageState ? 
                    `-${Math.max(0, (((imageState.size - compressedInfo.size) / imageState.size) * 100)).toFixed(1)}%` 
                    : '0%'}
                </span>
             </div>
          </div>

        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-200 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => { setMode(AppMode.HOME); setImageState(null); }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-indigo-500/20 transition-all">
            P
          </div>
          <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">{t.title}</span>
        </div>
        
        <div className="flex items-center gap-4">
           <LanguageSelector currentLang={lang} onSelect={setLang} />
           <div className="hidden md:block text-xs font-medium text-zinc-500 border border-zinc-800 px-3 py-1 rounded-full">
             {t.clientSideOnly}
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {mode === AppMode.HOME && renderHome()}
        {mode === AppMode.QUICK && renderQuickMode()}
        {mode === AppMode.EDITOR && renderEditor()}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-600 text-sm">
        <p className="flex items-center justify-center gap-2 mb-2">
           {t.footer}
        </p>
        <p className="text-xs opacity-50">
          {t.footerSub}
        </p>
      </footer>
    </div>
  );
}

export default App;