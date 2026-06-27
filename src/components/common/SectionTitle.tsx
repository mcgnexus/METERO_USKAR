export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
      {children}
    </h2>
  );
}
