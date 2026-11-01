import { requirePermission } from "@/lib/auth/session";
import { ModulePage } from "@/components/module-page";
export default async function Page(){await requirePermission("inventory.read");return <ModulePage slug="yarn"/>;}
