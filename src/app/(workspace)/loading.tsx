export default function Loading() {
  return <div role="status" aria-live="polite" className="space-y-6">
    <p className="text-sm text-stone-600">Đang tải nội dung…</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-9 w-48 rounded-lg bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl border border-stone-200 bg-white" />)}
      </div>
    </div>
  </div>;
}