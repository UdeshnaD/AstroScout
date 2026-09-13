import { ObservingRouteShell } from "@ui/ObservingRouteShell";

export default function ObservingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ObservingRouteShell>{children}</ObservingRouteShell>;
}
