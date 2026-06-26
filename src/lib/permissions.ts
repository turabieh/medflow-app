// Central definition of all grantable permissions
// Each entry describes a page/feature that can be granted to a non-doctor user

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  group: string;
  defaultRoles: string[]; // roles that have this by default (no grant needed)
}

export const PERMISSIONS: PermissionDef[] = [
  // Finance — secretary doesn't have these by default
  { key:"finance.view",        label:"View Finance Dashboard",    description:"See revenue, expenses and financial overview",      group:"Finance",  defaultRoles:["admin","doctor"] },
  { key:"finance.expenses",    label:"Manage Expenses",           description:"Add and edit clinic expense records",               group:"Finance",  defaultRoles:["admin"] },
  { key:"finance.salaries",    label:"View Staff Salaries",       description:"See payroll and monthly salary records",            group:"Finance",  defaultRoles:["admin"] },
  { key:"finance.reports",     label:"Print Financial Reports",   description:"Download and print P&L and financial summaries",    group:"Finance",  defaultRoles:["admin","doctor"] },

  // Patients — delete is admin-only by default
  { key:"patients.delete",     label:"Delete Patient Records",    description:"Permanently remove patients and their data",        group:"Patients", defaultRoles:["admin"] },

  // Schedule
  { key:"schedule.manage",     label:"Manage Working Hours",      description:"Edit doctor working hours, blocks and holidays",    group:"Schedule", defaultRoles:["admin"] },

  // Data
  { key:"data.backup",         label:"Download Data Backup",      description:"Export all clinic data as CSV files",              group:"Data",     defaultRoles:["admin"] },
  { key:"data.catalog",        label:"Manage Catalogs",           description:"Edit medications, symptoms and procedures catalog", group:"Data",     defaultRoles:["admin"] },
];


export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map(p => p.group))];

// Server-side: check if a user has a permission
// Returns true if the user's role includes it by default, or if explicitly granted
import { createClient } from "@/lib/supabase/server";

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users").select("role").eq("id", userId).single();
  if (!user) return false;

  const def = PERMISSIONS.find(p => p.key === permission);
  if (!def) return false;

  // Check default role access
  if (def.defaultRoles.includes(user.role)) return true;

  // Check explicit grant
  const { data: grant } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("user_id", userId)
    .eq("permission", permission)
    .single();

  return !!grant;
}

// Get all permissions for a user (for sidebar/nav display)
export async function getUserPermissions(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users").select("role").eq("id", userId).single();
  if (!user) return [];

  // Default role permissions
  const defaults = PERMISSIONS
    .filter(p => p.defaultRoles.includes(user.role))
    .map(p => p.key);

  // Explicit grants
  const { data: grants } = await supabase
    .from("user_permissions")
    .select("permission")
    .eq("user_id", userId);

  const granted = (grants ?? []).map((g: {permission:string}) => g.permission);

  return [...new Set([...defaults, ...granted])];
}
