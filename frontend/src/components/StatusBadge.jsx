import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function StatusBadge({ status }) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle,
          label: 'Approved'
        };
      case 'ACTIVE':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Clock,
          label: 'Active (Outside)'
        };
      case 'PENDING':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock,
          label: 'Pending Approval'
        };
      case 'LATE':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
          icon: AlertTriangle,
          label: 'Late Return'
        };
      case 'EXPIRED':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: CheckCircle,
          label: 'Completed / Expired'
        };
      case 'NO_SHOW':
        return {
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: AlertCircle,
          label: 'No-Show'
        };
      case 'CANCELLED':
        return {
          bg: 'bg-zinc-100 text-zinc-600 border-zinc-200',
          icon: XCircle,
          label: 'Cancelled'
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: XCircle,
          label: 'Rejected'
        };
      case 'INSIDE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: ShieldCheck,
          label: 'Inside Hostel'
        };
      case 'OUTSIDE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertTriangle,
          label: 'Outside Campus'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: Clock,
          label: status || 'Unknown'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}
