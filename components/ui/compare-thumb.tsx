type CompareThumbProps = {
  label: string;
  src: string;
};

export function CompareThumb({ label, src }: CompareThumbProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <img src={src} alt={label} className="w-full h-24 object-contain bg-slate-50" />
      </div>
    </div>
  );
}
