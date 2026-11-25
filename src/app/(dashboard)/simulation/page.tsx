// src/app/(dashboard)/simulation/page.tsx
// Simulation panel removed — HydroNode now runs live-only.
// Redirect to dashboard.
import { redirect } from "next/navigation";
export default function SimulationRedirect() {
  redirect("/");
}
