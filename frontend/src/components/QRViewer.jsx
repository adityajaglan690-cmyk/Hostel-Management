import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ShieldCheck, Download, AlertCircle } from 'lucide-react';

export default function QRViewer({ student }) {
  const [copied, setCopied] = useState(false);

  if (!student) return null;

  const qrValue = student.permanent_qr_id;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('student-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${student.student_id}_Permanent_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-sm mx-auto text-center">
      <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-100">
        <div className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-brand-600" />
          <span className="font-bold text-sm text-slate-800">Permanent Student QR</span>
        </div>
        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Official Identity
        </span>
      </div>

      {/* QR Code Presentation Box */}
      <div className="bg-slate-50 p-6 rounded-2xl inline-block border border-slate-100 shadow-inner my-2">
        <QRCodeSVG
          id="student-qr-svg"
          value={qrValue}
          size={180}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Identity Code */}
      <div className="mt-3">
        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">Identity Key</span>
        <div className="flex items-center justify-center space-x-2 mt-1">
          <code className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {qrValue}
          </code>
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
            title="Copy QR Code string"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Student Details Card */}
      <div className="mt-4 pt-4 border-t border-slate-100 text-left bg-slate-50/70 p-3 rounded-xl">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Student Name:</span>
          <span className="font-semibold text-slate-800">{student.name}</span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1.5">
          <span className="text-slate-500">College ID:</span>
          <span className="font-semibold text-slate-800">{student.student_id}</span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1.5">
          <span className="text-slate-500">Hostel & Room:</span>
          <span className="font-semibold text-slate-800">{student.hostel} - Rm {student.room}</span>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="w-full mt-4 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
      >
        <Download className="w-4 h-4 text-slate-500" />
        <span>Download QR Identity Card</span>
      </button>

      {/* Disclaimer Notice */}
      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 flex items-start space-x-2 text-[11px] text-amber-800 text-left">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Identity Notice:</strong> This permanent QR serves as your digital student ID. Gate authorization is granted only when you possess an active approved outpass.
        </span>
      </div>
    </div>
  );
}
