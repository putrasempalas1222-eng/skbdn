
import React from 'react';
import { Skbn, SkbnStatus } from '../types';

interface StatsProps {
  skbns: Skbn[];
}

export const Stats: React.FC<StatsProps> = ({ skbns }) => {
  const totalDraft = skbns.filter(s => 
    s.status === SkbnStatus.DRAFT_CREATED || 
    s.status === SkbnStatus.DRAFT_APPROVED_BY_AP2 ||
    s.status === SkbnStatus.DRAFT_REJECTED_BY_AP2 ||
    s.status === SkbnStatus.DRAFT_REJECTED_BY_KEUANGAN ||
    s.status === SkbnStatus.DRAFT_VERIFIED
  ).length;

  const totalFinal = skbns.filter(s => 
    s.status === SkbnStatus.FINAL_SENT || 
    s.status === SkbnStatus.FINAL_APPROVED_BY_AP2 ||
    s.status === SkbnStatus.FINAL_REJECTED_BY_AP2 ||
    s.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN ||
    s.status === SkbnStatus.FINAL_VERIFIED
  ).length;

  const totalApproved = skbns.filter(s => s.status === SkbnStatus.FINAL_VERIFIED).length;
  
  const totalRejected = skbns.filter(s => 
    s.status === SkbnStatus.DRAFT_REJECTED_BY_AP2 || 
    s.status === SkbnStatus.DRAFT_REJECTED_BY_KEUANGAN ||
    s.status === SkbnStatus.FINAL_REJECTED_BY_AP2 ||
    s.status === SkbnStatus.FINAL_REJECTED_BY_KEUANGAN
  ).length;

  const totalPending = skbns.filter(s => 
    s.status === SkbnStatus.DRAFT_CREATED || 
    s.status === SkbnStatus.DRAFT_APPROVED_BY_AP2 ||
    s.status === SkbnStatus.FINAL_SENT ||
    s.status === SkbnStatus.FINAL_APPROVED_BY_AP2
  ).length;

  const statCards = [
    {
      title: 'Total Draft SKBDN',
      value: totalDraft,
      icon: 'fa-file-lines',
      color: 'border-blue-200 text-[#1a73e8] dark:border-blue-900 dark:text-blue-300',
      accent: 'bg-[#1a73e8]',
    },
    {
      title: 'Total Final SKBDN',
      value: totalFinal,
      icon: 'fa-file-shield',
      color: 'border-violet-200 text-violet-600 dark:border-violet-900 dark:text-violet-300',
      accent: 'bg-violet-500',
    },
    {
      title: 'Total Approved',
      value: totalApproved,
      icon: 'fa-circle-check',
      color: 'border-green-200 text-[#34a853] dark:border-green-900 dark:text-green-300',
      accent: 'bg-[#34a853]',
    },
    {
      title: 'Total Rejected',
      value: totalRejected,
      icon: 'fa-circle-xmark',
      color: 'border-red-200 text-[#ea4335] dark:border-red-900 dark:text-red-300',
      accent: 'bg-[#ea4335]',
    },
    {
      title: 'Total Pending',
      value: totalPending,
      icon: 'fa-clock',
      color: 'border-yellow-200 text-[#fbbc04] dark:border-yellow-900 dark:text-yellow-300',
      accent: 'bg-[#fbbc04]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {statCards.map((card, idx) => (
        <div 
          key={idx} 
          className={`relative overflow-hidden bg-white dark:bg-slate-900 ${card.color} border rounded-lg p-3 sm:p-4 min-h-28 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300`}
        >
          <span className={`absolute left-0 top-0 h-full w-1 ${card.accent}`}></span>
          <div className="flex justify-between items-start gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase opacity-80 leading-snug">{card.title}</span>
            <span className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <i className={`fa-solid ${card.icon} text-base opacity-90`}></i>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
