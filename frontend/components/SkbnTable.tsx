
import React from 'react';
import { Skbn, SkbnStatus, UserRole } from '../types';

interface SkbnTableProps {
  skbns: Skbn[];
  onSelect: (skbn: Skbn) => void;
  selectedId?: string;
  currentRole: UserRole;
  onApproveClick: (skbn: Skbn) => void;
  onSendFinalClick: (skbn: Skbn) => void;
}

export const SkbnTable: React.FC<SkbnTableProps> = ({
  skbns,
  onSelect,
  selectedId,
  currentRole,
  onApproveClick,
  onSendFinalClick
}) => {

  const getStatusBadge = (status: SkbnStatus) => {
    let color = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    if (status.includes('Verified')) {
      color = "bg-green-50 text-[#34a853] dark:bg-green-950 dark:text-green-300";
    } else if (status.includes('Rejected')) {
      color = "bg-red-50 text-[#ea4335] dark:bg-red-950 dark:text-red-300";
    } else if (status.includes('Approved')) {
      color = "bg-blue-50 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300";
    } else if (status.includes('Sent') || status.includes('Created')) {
      color = "bg-yellow-50 text-amber-700 dark:bg-yellow-950 dark:text-yellow-300";
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
        {status}
      </span>
    );
  };

  const canAction = (skbn: Skbn) => {
    if (currentRole === UserRole.AP2) {
      return skbn.status === SkbnStatus.DRAFT_CREATED || skbn.status === SkbnStatus.FINAL_SENT;
    }
    if (currentRole === UserRole.KEUANGAN) {
      return skbn.status === SkbnStatus.DRAFT_APPROVED_BY_AP2 || skbn.status === SkbnStatus.FINAL_APPROVED_BY_AP2;
    }
    if (currentRole === UserRole.BUYER) {
      return skbn.status === SkbnStatus.DRAFT_VERIFIED || skbn.status.includes('Rejected');
    }
    return false;
  };

  const handleDownloadPdf = (base64Data: string, fileName: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'dokumen.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
        <h3 className="text-base sm:text-lg font-bold text-[#202124] dark:text-slate-100">Daftar Dokumen SKBDN</h3>
        <span className="text-xs text-slate-500 font-medium">Pilih dokumen untuk melihat detail</span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="p-4">Nomor SKBDN</th>
              <th className="p-4">Tanggal</th>
              <th className="p-4">Nama File</th>
              <th className="p-4">File PDF</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {skbns.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Tidak ada dokumen SKBDN ditemukan.
                </td>
              </tr>
            ) : (
              skbns.map((skbn) => {
                const isSelected = selectedId === skbn.id;
                const isActionable = canAction(skbn);

                return (
                  <tr 
                    key={skbn.id}
                    onClick={() => onSelect(skbn)}
                    className={`cursor-pointer transition-all hover:bg-blue-50/60 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-[#1a73e8]' : ''}`}
                  >
                    <td className="p-4 font-semibold text-sm text-slate-800 dark:text-slate-200 min-w-44">
                      {skbn.nomor_skbn}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {skbn.tanggal}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 min-w-40">
                      {skbn.vendor}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5">
                        {skbn.pdf_data ? (
                          <button 
                            onClick={() => handleDownloadPdf(skbn.pdf_data!, skbn.pdf_name || 'skbn.pdf')}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#1a73e8] dark:text-blue-300 hover:underline"
                          >
                            <i className="fa-solid fa-file-arrow-down text-rose-500 text-sm"></i>
                            <span>Unduh PDF</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No PDF (Dummy)</span>
                        )}
                        
                        {skbn.rejection_pdf_data && (
                          <button 
                            onClick={() => handleDownloadPdf(skbn.rejection_pdf_data!, skbn.rejection_pdf_name || 'rejection.pdf')}
                            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            <i className="fa-solid fa-file-circle-exclamation text-rose-500 text-sm"></i>
                            <span>Unduh PDF Tolakan</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(skbn.status)}
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {isActionable && (
                        <div className="flex justify-end gap-2">
                          {(currentRole === UserRole.AP2 || currentRole === UserRole.KEUANGAN) && (
                            <button
                              onClick={() => onApproveClick(skbn)}
                            className="px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
                            >
                              <i className="fa-solid fa-gavel mr-1"></i> Proses
                            </button>
                          )}
                          {currentRole === UserRole.BUYER && skbn.status === SkbnStatus.DRAFT_VERIFIED && (
                            <button
                              onClick={() => onSendFinalClick(skbn)}
                              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                            >
                              <i className="fa-solid fa-file-arrow-up mr-1"></i> Upload Final
                            </button>
                          )}
                          {currentRole === UserRole.BUYER && skbn.status.includes('Rejected') && (
                            <button
                              onClick={() => onApproveClick(skbn)}
                              className="px-3 py-1.5 rounded-lg bg-[#fbbc04] hover:bg-amber-500 text-slate-900 text-xs font-bold shadow-md shadow-amber-500/10 transition-all"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i>
                              {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Revisi Draft'}
                            </button>
                          )}
                        </div>
                      )}
                      {!isActionable && (
                        <span className="text-xs text-slate-400 italic">No Action</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
        {skbns.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Tidak ada dokumen SKBDN ditemukan.
          </div>
        ) : (
          skbns.map((skbn) => {
            const isSelected = selectedId === skbn.id;
            const isActionable = canAction(skbn);

            return (
              <article
                key={skbn.id}
                onClick={() => onSelect(skbn)}
                className={`p-4 space-y-3 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-l-4 border-l-[#1a73e8] dark:bg-blue-950/30' : 'hover:bg-blue-50/60 dark:hover:bg-slate-800/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Nomor SKBDN</p>
                    <h4 className="text-sm font-bold text-[#202124] dark:text-slate-100 break-words">{skbn.nomor_skbn}</h4>
                  </div>
                  <div className="shrink-0">{getStatusBadge(skbn.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold uppercase text-slate-400">Tanggal</p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300">{skbn.tanggal}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold uppercase text-slate-400">Nama File</p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300 break-words">{skbn.vendor}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {skbn.pdf_data ? (
                    <button
                      onClick={() => handleDownloadPdf(skbn.pdf_data!, skbn.pdf_name || 'skbn.pdf')}
                      className="min-h-9 px-3 rounded-lg bg-blue-50 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-file-arrow-down text-rose-500"></i>
                      <span>Unduh PDF</span>
                    </button>
                  ) : (
                    <span className="min-h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 flex items-center">No PDF</span>
                  )}

                  {skbn.rejection_pdf_data && (
                    <button
                      onClick={() => handleDownloadPdf(skbn.rejection_pdf_data!, skbn.rejection_pdf_name || 'rejection.pdf')}
                      className="min-h-9 px-3 rounded-lg bg-red-50 text-[#ea4335] dark:bg-red-950 dark:text-red-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-file-circle-exclamation"></i>
                      <span>PDF Tolakan</span>
                    </button>
                  )}
                </div>

                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                  {isActionable ? (
                    <div className="flex flex-wrap gap-2">
                      {(currentRole === UserRole.AP2 || currentRole === UserRole.KEUANGAN) && (
                        <button
                          onClick={() => onApproveClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
                        >
                          <i className="fa-solid fa-gavel mr-1"></i> Proses
                        </button>
                      )}
                      {currentRole === UserRole.BUYER && skbn.status === SkbnStatus.DRAFT_VERIFIED && (
                        <button
                          onClick={() => onSendFinalClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                        >
                          <i className="fa-solid fa-file-arrow-up mr-1"></i> Upload Final
                        </button>
                      )}
                      {currentRole === UserRole.BUYER && skbn.status.includes('Rejected') && (
                        <button
                          onClick={() => onApproveClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-[#fbbc04] hover:bg-amber-500 text-slate-900 text-xs font-bold shadow-md shadow-amber-500/10 transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1"></i>
                          {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Revisi Draft'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Tidak ada aksi</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
