import {
  BarChart3,
  Building2,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  Gauge,
  GitBranch,
  Handshake,
  Landmark,
  ListTodo,
  Mail,
  ShieldCheck,
  Users,
  UserRoundCog,
  Wrench,
} from "lucide-react";

const owner = ["OWNER"];
const admin = ["ADMIN"];
const operator = ["ADMIN"];
const staffManagers = ["OWNER", "ADMIN"];
const technician = ["TECHNICIAN"];

export const navigation = [
  { label: "Branch Portal", path: "/branch/portal", icon: Building2, roles: staffManagers },
  { label: "Dashboard", path: "/dashboard", icon: Gauge, roles: [...owner, ...operator, ...technician] },
  { label: "Customers", path: "/customers", icon: Users, roles: operator },
  { label: "Repairs", path: "/repair", icon: ClipboardList, roles: operator },
  { label: "My Repairs", path: "/technician/repairs", icon: ListTodo, roles: technician },
  { label: "Estimates", path: "/repair/estimates", icon: ShieldCheck, roles: operator },
  { label: "Parts Usage", path: "/repair/parts-usage", icon: Wrench, roles: operator },
  { label: "Assignments", path: "/assignments", icon: UserRoundCog, roles: operator },
  { label: "Inventory", path: "/inventory", icon: Boxes, roles: operator },
  { label: "Billing", path: "/billing", icon: CreditCard, roles: operator },
  { label: "Vendors", path: "/vendors", icon: BriefcaseBusiness, roles: operator },
  { label: "Handover", path: "/handover", icon: Handshake, roles: operator },
  { label: "Branches", path: "/branches", icon: GitBranch, roles: owner },
  { label: "Business Profile", path: "/business", icon: Building2, roles: owner },
  { label: "Staff", path: "/staff", icon: UserRoundCog, roles: staffManagers },
  { label: "Subscription", path: "/subscription", icon: CreditCard, roles: owner },
  { label: "Businesses", path: "/super-admin/businesses", icon: Landmark, roles: ["SUPER_ADMIN"] },
  { label: "Inquiries", path: "/super-admin/contacts", icon: Mail, roles: ["SUPER_ADMIN"] },
];
