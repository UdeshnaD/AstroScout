import { UnifiedApp } from "@ui/UnifiedApp";
import { UIProviders } from "@ui/Providers";

export default function ObservingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProviders>
      <UnifiedApp />
      {children}
    </UIProviders>
  );
}
