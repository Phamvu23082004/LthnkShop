import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
 const session=await requireSession();
 return <AppShell profile={session.profile} grants={session.grants}>{children}</AppShell>;
}
