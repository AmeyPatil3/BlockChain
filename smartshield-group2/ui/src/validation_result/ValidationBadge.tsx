import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { ValidationResult } from '../../../validator/types.ts';

interface ValidationBadgeProps {
  validationResult: ValidationResult | null;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ validationResult }) => {
  if (!validationResult) {
    return (
      <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-xs">
        <span className="text-sm text-slate-500">Status: Awaiting execution validation...</span>
      </div>
    );
  }

  const isConfirmed = validationResult.status === 'CONFIRMED';
  const isRejected = validationResult.status === 'REJECTED';

  const criteria = [
    { label: 'Candidate Path Executable', pass: validationResult.executable },
    { label: 'Expected Storage Write Detected', pass: validationResult.write_detected },
    { label: 'Expected Storage Read Detected', pass: validationResult.read_detected },
    { label: 'Storage Slot & Offset Match', pass: validationResult.storage_match },
    { label: `SMT Guard Constraints (${validationResult.constraints})`, pass: validationResult.constraints === 'SAT' },
    { label: 'Sensitive Sink Reached', pass: validationResult.sensitive_operation_reached },
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {isConfirmed && (
            <div className="px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-300 text-red-700 font-bold text-sm flex items-center gap-2 glow-confirmed">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              CONFIRMED VULNERABILITY
            </div>
          )}
          {isRejected && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold text-sm flex items-center gap-2 glow-safe">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              REJECTED (SAFE / BENIGN)
            </div>
          )}
          {!isConfirmed && !isRejected && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 font-bold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              INCONCLUSIVE
            </div>
          )}
          <span className="text-xs text-slate-600">
            Target Variable: <strong className="text-slate-900 font-mono font-semibold">{validationResult.variable}</strong>
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
        {validationResult.reason}
      </p>

      {/* 6 Verification Criteria Checklist */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            {c.pass ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            )}
            <span className={c.pass ? 'text-slate-800 font-medium' : 'text-slate-500'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
