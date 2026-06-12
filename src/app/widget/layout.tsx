export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0" style={{ background: 'transparent' }}>
      {children}
    </div>
  );
}
