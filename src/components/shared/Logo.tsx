export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Mark */}
      <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/10 border border-slate-800">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1">
          <span className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">
            Signage<span className="text-blue-600">CMS</span>
          </span>
        </div>
        <span className="text-[9px] font-semibold tracking-widest text-slate-400 uppercase leading-none mt-1">
          PT Rolas Medika
        </span>
      </div>
    </div>
  );
}
