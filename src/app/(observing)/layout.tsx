import { AstroScoutApp } from "@ui/AstroScoutApp";
import { UIProviders } from "@ui/Providers";

export default function ObservingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProviders>
      <AstroScoutApp />
      {children}
    </UIProviders>
  );
}
