import { UnifiedApp } from "@ui/UnifiedApp";

export default function ObservingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UnifiedApp />
      {children}
    </>
  );
}
