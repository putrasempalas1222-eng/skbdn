
import React, { useState, useRef } from 'react';
import { Skbn, SkbnStatus } from '../types';

interface SkbnFormProps {
  onSubmit: (data: Omit<Skbn, 'id' | 'created_at'>) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Skbn | null;
  buyerName: string;
}

export const SkbnForm: React.FC<SkbnFormProps> = ({ onSubmit, onCancel, initialData, buyerName }) => {
  const isFinalUpload = initialData?.status === SkbnStatus.DRAFT_VERIFIED ||
    initialData?.status === SkbnStatus.FINAL_REJECTED_BY_AP2 ||
    initialData?.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN;
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  // Automatically generated metadata preview state
  const [generatedData, setGeneratedData] = useState<{
    nomor_skbn: string;
    tanggal: string;
    buyer: string;
    vendor: string;
    keterangan: string;
  } | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (file: File) => {
    if (isProcessing || isSubmitting) return;
    if (file.type !== 'application/pdf') {
      alert('Hanya file PDF yang diperbolehkan!');
      return;
    }
    setPdfFile(file);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      setPdfData(base64);

      const fileNameOnly = file.name.replace(/\.[^/.]+$/, "");

      // Auto-generate metadata instantly
      setGeneratedData({
        nomor_skbn: initialData?.nomor_skbn || `SKBDN/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`,
        tanggal: initialData?.tanggal || new Date().toISOString().split('T')[0],
        buyer: buyerName,
        vendor: fileNameOnly || file.name,
        keterangan: isFinalUpload
          ? `Dokumen final SKBDN diunggah dari file: ${file.name}`
          : `Dokumen SKBDN resmi diunggah dari file: ${file.name}`
      });

    } catch (error) {
      console.error('Gagal memproses PDF:', error);
      alert('Gagal memproses file PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isProcessing || isSubmitting) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedData || !pdfBase64 || isProcessing || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        nomor_skbn: generatedData.nomor_skbn,
        tanggal: generatedData.tanggal,
        buyer: generatedData.buyer,
        vendor: generatedData.vendor,
        keterangan: generatedData.keterangan,
        status: initialData ? initialData.status : SkbnStatus.DRAFT_CREATED,
        pdf_name: pdfFile?.name || 'dokumen.pdf',
        pdf_data: pdfBase64
      });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-6 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-5 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-[#202124] dark:text-slate-100 leading-snug">
          {isFinalUpload ? 'Upload Final SKBDN' : initialData ? 'Revisi / Unggah Ulang SKBDN' : 'Unggah Draft SKBDN'}
        </h3>
        <button 
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Area */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!isProcessing && !isSubmitting) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-lg p-5 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] sm:min-h-[220px] ${
            isSubmitting
              ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 cursor-not-allowed opacity-80'
              : dragActive 
              ? 'border-[#1a73e8] bg-blue-50 dark:bg-blue-950/30' 
              : pdfFile 
                ? 'border-[#34a853] bg-green-50 dark:bg-green-950/20' 
                : 'border-slate-300 dark:border-slate-700 hover:border-[#1a73e8] hover:bg-blue-50/50 dark:hover:bg-slate-800/30'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf"
            disabled={isProcessing || isSubmitting}
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />
          
          {isProcessing ? (
            <div className="space-y-3">
              <i className="fa-solid fa-spinner animate-spin text-4xl text-[#1a73e8]"></i>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Memproses file PDF...</p>
            </div>
          ) : pdfFile ? (
            <div className="space-y-2">
              <i className="fa-solid fa-file-pdf text-4xl text-[#34a853]"></i>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 break-all">{pdfFile.name}</p>
              <p className="text-xs text-slate-400">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB - Klik untuk mengganti file</p>
            </div>
          ) : (
            <div className="space-y-3">
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-400 dark:text-slate-600"></i>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tarik & Lepas file PDF di sini</p>
              <p className="text-xs text-slate-400">
                {isFinalUpload ? 'Unggah dokumen final untuk dikirim kembali ke AP2' : 'Sistem akan otomatis membuat draf dokumen SKBDN dari file Anda'}
              </p>
            </div>
          )}
        </div>

        {/* Generated Metadata Preview (Read-Only) */}
        {generatedData && (
          <div className="p-5 rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-blue-200 dark:border-blue-900 pb-2">
              <i className="fa-solid fa-circle-info text-[#1a73e8]"></i>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a73e8] dark:text-blue-300">Informasi Dokumen Terbuat</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor SKBDN</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">{generatedData.nomor_skbn}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{generatedData.tanggal}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama File</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">{generatedData.vendor}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterangan</span>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">{generatedData.keterangan}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button 
            type="submit"
            disabled={!generatedData || isProcessing || isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <i className="fa-solid fa-spinner animate-spin"></i>}
            <span>{isSubmitting ? 'Mengirim PDF...' : isFinalUpload ? 'Kirim Final ke AP2' : 'Kirim ke AP2'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
