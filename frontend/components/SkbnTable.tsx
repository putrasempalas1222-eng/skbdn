
import React from 'react';
import { Skbn, SkbnStatus, UserRole } from '../types';

interface SkbnTableProps {
  skbns: Skbn[];
  onSelect: (skbn: Skbn) => void;
  selectedId?: string;
  currentRole: UserRole;
  onViewDetail: (skbn: Skbn) => void;
  onApproveClick: (skbn: Skbn) => void;
  onSendFinalClick: (skbn: Skbn) => void;
}

export const SkbnTable: React.FC<SkbnTableProps> = ({
  skbns,
  onSelect,
  selectedId,
  currentRole,
  onViewDetail,
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

  const canUploadFinal = (skbn: Skbn) => {
    if (currentRole !== UserRole.BUYER && currentRole !== UserRole.AP2) return false;
    return skbn.status === SkbnStatus.DRAFT_VERIFIED ||
      skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 ||
      skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN;
  };

  const handleDownloadPdf = (base64Data: string, fileName: string) => {
    const blob = createPdfBlob(base64Data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'dokumen.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewPdf = (base64Data: string) => {
    const blob = createPdfBlob(base64Data);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const createPdfBlob = (base64Data: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  };

  const isFinalStage = (skbn: Skbn) => skbn.status.includes('Final');

  const getDraftPdf = (skbn: Skbn) => {
    if (isFinalStage(skbn) && !skbn.final_pdf_data) return null;
    return skbn.pdf_data ? { name: skbn.pdf_name || 'draft-skbdn.pdf', data: skbn.pdf_data } : null;
  };

  const getFinalPdf = (skbn: Skbn) => {
    if (skbn.final_pdf_data) return { name: skbn.final_pdf_name || 'final-skbdn.pdf', data: skbn.final_pdf_data };
    if (isFinalStage(skbn) && skbn.pdf_data) return { name: skbn.pdf_name || 'final-skbdn.pdf', data: skbn.pdf_data };
    return null;
  };

  const getRejectionPdf = (skbn: Skbn) => {
    return skbn.rejection_pdf_data
      ? { name: skbn.rejection_pdf_name || 'tolakan-skbdn.pdf', data: skbn.rejection_pdf_data }
      : null;
  };

  const renderPdfActions = (pdf: { name: string; data: string } | null, emptyLabel: string) => {
    if (!pdf) {
      return <span className="text-xs text-slate-400 italic">{emptyLabel}</span>;
    }

    return (
      <div className="flex flex-wrap gap-2 min-w-36">
        <button
          onClick={() => handleViewPdf(pdf.data)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900"
        >
          <i className="fa-solid fa-eye"></i>
          <span>Lihat</span>
        </button>
        <button
          onClick={() => handleDownloadPdf(pdf.data, pdf.name)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900"
        >
          <i className="fa-solid fa-file-arrow-down"></i>
          <span>Unduh</span>
        </button>
      </div>
    );
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
              <th className="p-4">File Draft</th>
              <th className="p-4">File Final</th>
              <th className="p-4">File Tolakan</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {skbns.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Tidak ada dokumen SKBDN ditemukan.
                </td>
              </tr>
            ) : (
              skbns.map((skbn) => {
                const isSelected = selectedId === skbn.id;
                const isActionable = canAction(skbn);
                const isFinalUploadAllowed = canUploadFinal(skbn);
                const draftPdf = getDraftPdf(skbn);
                const finalPdf = getFinalPdf(skbn);
                const rejectionPdf = getRejectionPdf(skbn);

                return (
                  <tr 
                    key={skbn.id}
                    onClick={() => onSelect(skbn)}
                    className={`cursor-pointer transition-all hover:bg-blue-50/60 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-[#1a73e8]' : ''}`}
                  >
                    <td className="p-4 min-w-44">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 break-words">
                        {skbn.nomor_skbn}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 break-words">
                        {skbn.buyer || 'Buyer'}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {skbn.tanggal}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {renderPdfActions(draftPdf, 'Belum ada draft')}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {renderPdfActions(finalPdf, 'Belum ada final')}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {renderPdfActions(rejectionPdf, 'Belum ada tolakan')}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(skbn.status)}
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onViewDetail(skbn)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                        >
                          <i className="fa-solid fa-up-right-from-square mr-1"></i> View Lengkap
                        </button>
                        {(isActionable || isFinalUploadAllowed) && (
                          <>
                          {(currentRole === UserRole.AP2 || currentRole === UserRole.KEUANGAN) && (
                            isFinalUploadAllowed && currentRole === UserRole.AP2 ? (
                              <button
                                onClick={() => onSendFinalClick(skbn)}
                                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                              >
                                <i className="fa-solid fa-file-arrow-up mr-1"></i>
                                {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Upload Final'}
                              </button>
                            ) : (
                            <button
                              onClick={() => onApproveClick(skbn)}
                            className="px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
                            >
                              <i className="fa-solid fa-gavel mr-1"></i> Proses
                            </button>
                            )
                          )}
                          {currentRole === UserRole.BUYER && isFinalUploadAllowed && (
                            <button
                              onClick={() => onSendFinalClick(skbn)}
                              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                            >
                              <i className="fa-solid fa-file-arrow-up mr-1"></i>
                              {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Upload Final'}
                            </button>
                          )}
                          {currentRole === UserRole.BUYER && skbn.status.includes('Rejected') && !isFinalUploadAllowed && (
                            <button
                              onClick={() => onApproveClick(skbn)}
                              className="px-3 py-1.5 rounded-lg bg-[#fbbc04] hover:bg-amber-500 text-slate-900 text-xs font-bold shadow-md shadow-amber-500/10 transition-all"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i>
                              {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Revisi Draft'}
                            </button>
                          )}
                          </>
                        )}
                      </div>
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
                const isFinalUploadAllowed = canUploadFinal(skbn);
                const draftPdf = getDraftPdf(skbn);
                const finalPdf = getFinalPdf(skbn);
                const rejectionPdf = getRejectionPdf(skbn);

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
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 break-words">{skbn.buyer || 'Buyer'}</p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(skbn.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold uppercase text-slate-400">Tanggal</p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300">{skbn.tanggal}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold uppercase text-slate-400">File Draft</p>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300 break-words">{draftPdf ? 'Tersedia' : '-'}</p>
                  </div>
                </div>

                <div className="text-xs">
                  <p className="font-bold uppercase text-slate-400">File Final</p>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300 break-words">{finalPdf ? 'Tersedia' : '-'}</p>
                </div>

                <div className="text-xs">
                  <p className="font-bold uppercase text-slate-400">File Tolakan</p>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300 break-words">{rejectionPdf ? 'Tersedia' : '-'}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {draftPdf ? (
                    <button
                      onClick={() => handleViewPdf(draftPdf.data)}
                      className="min-h-9 px-3 rounded-lg bg-blue-50 text-[#1a73e8] dark:bg-blue-950 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-eye"></i>
                      <span>Lihat Draft</span>
                    </button>
                  ) : (
                    <span className="min-h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 flex items-center">Draft kosong</span>
                  )}

                  {finalPdf ? (
                    <button
                      onClick={() => handleViewPdf(finalPdf.data)}
                      className="min-h-9 px-3 rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-eye"></i>
                      <span>Lihat Final</span>
                    </button>
                  ) : (
                    <span className="min-h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 flex items-center">Final kosong</span>
                  )}

                  {rejectionPdf && (
                    <button
                      onClick={() => handleViewPdf(rejectionPdf.data)}
                      className="min-h-9 px-3 rounded-lg bg-red-50 text-[#ea4335] dark:bg-red-950 dark:text-red-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-eye"></i>
                      <span>Lihat Tolakan</span>
                    </button>
                  )}
                </div>

                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onViewDetail(skbn)}
                      className="min-h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                    >
                      <i className="fa-solid fa-up-right-from-square mr-1"></i> View Lengkap
                    </button>
                    {(isActionable || isFinalUploadAllowed) && (
                      <>
                      {(currentRole === UserRole.AP2 || currentRole === UserRole.KEUANGAN) && (
                        isFinalUploadAllowed && currentRole === UserRole.AP2 ? (
                          <button
                            onClick={() => onSendFinalClick(skbn)}
                            className="min-h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                          >
                            <i className="fa-solid fa-file-arrow-up mr-1"></i>
                            {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Upload Final'}
                          </button>
                        ) : (
                        <button
                          onClick={() => onApproveClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition-all"
                        >
                          <i className="fa-solid fa-gavel mr-1"></i> Proses
                        </button>
                        )
                      )}
                      {currentRole === UserRole.BUYER && isFinalUploadAllowed && (
                        <button
                          onClick={() => onSendFinalClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/10 transition-all"
                        >
                          <i className="fa-solid fa-file-arrow-up mr-1"></i>
                          {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Upload Final'}
                        </button>
                      )}
                      {currentRole === UserRole.BUYER && skbn.status.includes('Rejected') && !isFinalUploadAllowed && (
                        <button
                          onClick={() => onApproveClick(skbn)}
                          className="min-h-10 px-4 rounded-lg bg-[#fbbc04] hover:bg-amber-500 text-slate-900 text-xs font-bold shadow-md shadow-amber-500/10 transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square mr-1"></i>
                          {skbn.status === SkbnStatus.FINAL_REJECTED_BY_AP2 || skbn.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ? 'Upload Ulang Final' : 'Revisi Draft'}
                        </button>
                      )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
