export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg text-white font-bold text-base flex items-center justify-center">
            M
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Mockuper</h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Bria instruction + Nano Banana 2
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
