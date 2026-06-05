
import React, { useState, useRef } from 'react';
import { Skbn, SkbnStatus } from '../types';

const MAX_PDF_FILE_SIZE = 5 * 1024 * 1024;

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

  const defaultDocumentNumber = `SKBDN/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
  const [formData, setFormData] = useState<{
    nomor_skbn: string;
    tanggal: string;
    buyer: string;
    vendor: string;
    barang_tonase_harga: string;
    total_harga: string;
    nomor_kontrak: string;
    negara_asal: string;
    bank: string;
    date_of_issue: string;
    expired_date: string;
    keterangan: string;
  }>({
    nomor_skbn: initialData?.nomor_skbn || defaultDocumentNumber,
    tanggal: initialData?.tanggal || new Date().toISOString().split('T')[0],
    buyer: buyerName,
    vendor: initialData?.vendor || '',
    barang_tonase_harga: initialData?.barang_tonase_harga || '',
    total_harga: initialData?.total_harga || '',
    nomor_kontrak: initialData?.nomor_kontrak || '',
    negara_asal: initialData?.negara_asal || '',
    bank: initialData?.bank || '',
    date_of_issue: initialData?.date_of_issue || '',
    expired_date: initialData?.expired_date || '',
    keterangan: initialData?.keterangan || ''
  });

  const setDocumentField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isMetadataComplete = Boolean(
    formData.nomor_skbn.trim() &&
    formData.barang_tonase_harga.trim() &&
    formData.total_harga.trim() &&
    formData.nomor_kontrak.trim() &&
    formData.negara_asal.trim() &&
    formData.bank.trim() &&
    formData.date_of_issue &&
    formData.expired_date
  );

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
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_PDF_FILE_SIZE) {
      alert('Ukuran file PDF maksimal 5 MB. Silakan pilih file yang lebih kecil.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPdfFile(file);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      setPdfData(base64);

      const fileNameOnly = file.name.replace(/\.[^/.]+$/, "");

      setFormData(prev => ({
        ...prev,
        vendor: fileNameOnly || file.name,
        keterangan: isFinalUpload
          ? `Dokumen final SKBDN diunggah dari file: ${file.name}`
          : `Dokumen SKBDN resmi diunggah dari file: ${file.name}`
      }));

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
    if (!isMetadataComplete || !pdfBase64 || isProcessing || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        nomor_skbn: formData.nomor_skbn.trim(),
        tanggal: formData.tanggal,
        buyer: formData.buyer,
        vendor: formData.vendor || pdfFile?.name?.replace(/\.[^/.]+$/, "") || 'Dokumen SKBDN',
        barang_tonase_harga: formData.barang_tonase_harga.trim(),
        total_harga: formData.total_harga.trim(),
        nomor_kontrak: formData.nomor_kontrak.trim(),
        negara_asal: formData.negara_asal.trim(),
        bank: formData.bank.trim(),
        date_of_issue: formData.date_of_issue,
        expired_date: formData.expired_date,
        keterangan: formData.keterangan || `Dokumen SKBDN diunggah dari file: ${pdfFile?.name || 'dokumen.pdf'}`,
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
        <div className="p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/30 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <i className="fa-solid fa-clipboard-list text-[#1a73e8]"></i>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Data SKBDN</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nomor SKBDN</span>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.nomor_skbn}
                onChange={(e) => setDocumentField('nomor_skbn', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nomor Kontrak</span>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.nomor_kontrak}
                onChange={(e) => setDocumentField('nomor_kontrak', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>

            <label className="sm:col-span-2 space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Jenis Barang, Tonase dan Harga per Tonase</span>
              <textarea
                required
                disabled={isSubmitting}
                value={formData.barang_tonase_harga}
                onChange={(e) => setDocumentField('barang_tonase_harga', e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none resize-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Contoh: Batubara, 5.000 MT, Rp 1.200.000/MT"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Harga</span>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.total_harga}
                onChange={(e) => setDocumentField('total_harga', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
                placeholder="Contoh: Rp 6.000.000.000"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Negara Asal</span>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.negara_asal}
                onChange={(e) => setDocumentField('negara_asal', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Bank</span>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.bank}
                onChange={(e) => setDocumentField('bank', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Date Of Issue</span>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={formData.date_of_issue}
                onChange={(e) => setDocumentField('date_of_issue', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Expired Date</span>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={formData.expired_date}
                onChange={(e) => setDocumentField('expired_date', e.target.value)}
                className="w-full min-h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950"
              />
            </label>
          </div>
        </div>

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
              <p className="text-xs font-semibold text-slate-400">Maksimal ukuran file 5 MB</p>
            </div>
          )}
        </div>

        {pdfFile && (
          <div className="p-5 rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-blue-200 dark:border-blue-900 pb-2">
              <i className="fa-solid fa-circle-info text-[#1a73e8]"></i>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a73e8] dark:text-blue-300">Informasi Dokumen Terbuat</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor SKBDN</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">{formData.nomor_skbn}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.tanggal}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama File</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">{formData.vendor}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterangan</span>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">{formData.keterangan}</p>
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
            disabled={!isMetadataComplete || !pdfBase64 || isProcessing || isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <i className="fa-solid fa-spinner animate-spin"></i>}
            <span>{isSubmitting ? 'Mengirim PDF...' : isFinalUpload ? 'Kirim Final' : 'Kirim'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
