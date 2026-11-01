import { z } from "zod";
import { permissions } from "../../lib/auth/permissions";
export const passwordSchema=z.string().min(12).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/);
export const createAccountSchema=z.object({
 fullName:z.string().trim().min(2).max(100),
 email:z.email().max(254),
 password:passwordSchema,
});
export const updateAccountSchema=z.object({
 id:z.uuid(),fullName:z.string().trim().min(2).max(100),
 role:z.enum(["admin","staff"]),active:z.boolean(),
 permissions:z.array(z.enum(permissions)).max(permissions.length),
});
