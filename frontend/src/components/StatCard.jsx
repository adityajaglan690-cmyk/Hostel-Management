import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', description }) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">{value}</p>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>

      <div className={`p-3.5 rounded-2xl border ${colorStyles[color] || colorStyles.blue}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
