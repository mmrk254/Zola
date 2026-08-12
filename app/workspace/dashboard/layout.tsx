import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth";

function isHospitalAdmin(context: NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>) {
  return context.networkAdmin || context.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");
}

export default async function WorkspaceAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect("/workspace/login");
  }

  if (!isHospitalAdmin(context)) {
    redirect("/login?next=/dashboard&reason=hospital_only");
  }

  return children;
}
