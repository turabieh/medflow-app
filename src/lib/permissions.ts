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
  // Finance
  { key:"finance.view",        label:"View Finance Dashboard",    description:"See revenue, expenses and KPI overview",    group:"Finance",      defaultRoles:["admin","doctor"] },
  { key:"finance.reports",     label:"Print Financial Reports",   description:"Download and print P&L reports",           group:"Finance",      defaultRoles:["admin","doctor"] },
  { key:"finance.expenses",    label:"Manage Expenses",           description:"Add and edit clinic expenses",             group:"Finance",      defaultRoles:["admin"] },
  { key:"finance.salaries",    label:"View Staff Salaries",       description:"See payroll and salary records",           group:"Finance",      defaultRoles:["admin"] },

  // Claims & Insurance
  { key:"claims.view",         label:"View Insurance Claims",     description:"See submitted claims list",                group:"Insurance",    defaultRoles:["admin","doctor","secretary"] },
  { key:"claims.submit",       label:"Submit Insurance Claims",   description:"Create and submit new insurance claims",   group:"Insurance",    defaultRoles:["admin","secretary"] },
  { key:"claims.print",        label:"Print Claim Documents",     description:"Print insurance and hospital claim forms", group:"Insurance",    defaultRoles:["admin","secretary"] },

  // Reports
  { key:"reports.patient",     label:"Patient Reports",           description:"Generate and print patient visit reports", group:"Reports",      defaultRoles:["admin","doctor","secretary"] },
  { key:"reports.schedule",    label:"Schedule Reports",          description:"Export appointment and schedule summaries", group:"Reports",     defaultRoles:["admin","doctor"] },

  // Patients
  { key:"patients.edit",       label:"Edit Patient Records",      description:"Update patient info, insurance, allergies", group:"Patients",    defaultRoles:["admin","secretary"] },
  { key:"patients.delete",     label:"Delete Patient Records",    description:"Remove patients from the system",          group:"Patients",     defaultRoles:["admin"] },

  // Schedule
  { key:"schedule.doctor",     label:"View Doctor Schedule",      description:"See doctor's personal schedule and blocks", group:"Schedule",    defaultRoles:["admin","doctor"] },
  { key:"schedule.manage",     label:"Manage Working Hours",      description:"Edit doctor working hours and holidays",   group:"Schedule",     defaultRoles:["admin"] },

  // Data
  { key:"data.backup",         label:"Download Data Backup",      description:"Export clinic data as CSV files",          group:"Data",         defaultRoles:["admin"] },
  { key:"data.catalog",        label:"Manage Catalogs",           description:"Edit medications, symptoms, procedures",   group:"Data",         defaultRoles:["admin"] },
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
