import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function LiveTimer({ outpass, movementStatus }) {
  if (!outpass || !['APPROVED', 'ACTIVE', 'LATE'].includes(outpass.status)) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center">
        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="font-semibold text-slate-700 text-sm">No Active Outpass Window</h4>
        <p className="text-xs text-slate-500 mt-1">Apply for an outpass to generate your live countdown.</p>
      </div>
    );
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date();
    const approvedEnd = new Date(outpass.approved_end_time || outpass.requested_end_time);
    const graceEnd = new Date(approvedEnd.getTime() + 15 * 60 * 1000);

    const diffToEnd = approvedEnd.getTime() - now.getTime();
    const diffToGrace = graceEnd.getTime() - now.getTime();

    if (diffToEnd > 0) {
      // Normal approved window
      const hours = Math.floor(diffToEnd / (1000 * 60 * 60));
      const minutes = Math.floor((diffToEnd % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffToEnd % (1000 * 60)) / 1000);

      const isWarning = diffToEnd <= 10 * 60 * 1000; // <= 10 mins remaining
      return {
        mode: isWarning ? 'WARNING' : 'NORMAL',
        hours,
        minutes,
        seconds,
        isGrace: false,
        isLate: false,
        totalSeconds: Math.floor(diffToEnd / 1000)
      };
    } else if (diffToGrace > 0 && movementStatus === 'OUTSIDE') {
      // Within 15-minute grace entry window
      const minutes = Math.floor(diffToGrace / (1000 * 60));
      const seconds = Math.floor((diffToGrace % (1000 * 60)) / 1000);
      return {
        mode: 'GRACE',
        hours: 0,
        minutes,
        seconds,
        isGrace: true,
        isLate: false,
        totalSeconds: Math.floor(diffToGrace / 1000)
      };
    } else {
      // Past grace period -> Late
      const overdueMins = Math.floor((now.getTime() - approvedEnd.getTime()) / (1000 * 60));
      return {
        mode: 'LATE',
        hours: 0,
        minutes: overdueMins,
        seconds: 0,
        isGrace: false,
        isLate: true
      };
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [outpass, movementStatus]);

  const pad = (n) => String(n).padStart(2, '0');

  const approvedStart = new Date(outpass.approved_start_time || outpass.requested_start_time);
  const approvedEnd = new Date(outpass.approved_end_time || outpass.requested_end_time);

  return (
    <div className={`rounded-2xl p-4 sm:p-6 border shadow-sm transition-all ${
      timeLeft.mode === 'LATE'
        ? 'bg-rose-50 border-rose-200'
        : timeLeft.mode === 'GRACE'
        ? 'bg-amber-50 border-amber-300 animate-pulse'
        : timeLeft.mode === 'WARNING'
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 border-b pb-4 mb-4 border-slate-100">
        <div className="flex items-center space-x-2">
          <Clock className={`w-5 h-5 shrink-0 ${
            timeLeft.mode === 'LATE' ? 'text-rose-600' : timeLeft.mode === 'GRACE' ? 'text-amber-600' : 'text-brand-600'
          }`} />
          <span className="font-bold text-sm text-slate-800">Authoritative Live Timer</span>
        </div>

        <span className={`self-start min-[420px]:self-auto text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
          timeLeft.mode === 'LATE'
            ? 'bg-rose-100 text-rose-800'
            : timeLeft.mode === 'GRACE'
            ? 'bg-amber-100 text-amber-800'
            : timeLeft.mode === 'WARNING'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-emerald-100 text-emerald-800'
        }`}>
          {timeLeft.mode === 'LATE'
            ? 'OVERDUE / LATE'
            : timeLeft.mode === 'GRACE'
            ? '15-MIN GRACE ENTRY'
            : timeLeft.mode === 'WARNING'
            ? '10-MIN REMINDER WINDOW'
            : 'APPROVED WINDOW ACTIVE'}
        </span>
      </div>

      {/* Countdown Digits */}
      <div className="text-center my-3">
        {timeLeft.mode === 'LATE' ? (
          <div>
            <div className="text-2xl min-[360px]:text-3xl sm:text-5xl font-extrabold font-mono text-rose-600 tracking-tight">
              +{timeLeft.minutes}m OVERDUE
            </div>
            <p className="text-xs text-rose-700 font-medium mt-1">
              Grace period has expired. Please report immediately to hostel security.
            </p>
          </div>
        ) : timeLeft.mode === 'GRACE' ? (
          <div>
            <div className="text-3xl min-[360px]:text-4xl sm:text-5xl font-extrabold font-mono text-amber-600 tracking-tight">
              {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </div>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              GRACE PERIOD ACTIVE. Entry permitted within this countdown!
            </p>
          </div>
        ) : (
          <div>
            <div className="text-3xl min-[360px]:text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight">
              {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Remaining Time to Return</p>
          </div>
        )}
      </div>

      {/* Warning Notice Banner */}
      {timeLeft.mode === 'WARNING' && (
        <div className="mt-4 p-3 rounded-xl bg-orange-100/70 border border-orange-200 flex items-start space-x-2.5 text-xs text-orange-800">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <span>
            <strong>10-Minute Return Warning:</strong> Your outpass expires soon. Please make your way back to the hostel gate to avoid grace entry penalties.
          </span>
        </div>
      )}

      {/* Timing Details Grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
        <div className="bg-slate-50 p-2 rounded-lg">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved Departure</span>
          <span className="font-semibold text-slate-700">{approvedStart.toLocaleTimeString()}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg text-right">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved Return</span>
          <span className="font-semibold text-slate-700">{approvedEnd.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
