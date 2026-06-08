import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  Gauge,
  Handshake,
  ShieldCheck,
  Users,
  UserRoundCog,
  Wrench,
} from "lucide-react";

const all = ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "FRONT_DESK", "ACCOUNTANT", "RECEPTIONIST"];
const operations = ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "FRONT_DESK", "RECEPTIONIST"];
const finance = ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "FRONT_DESK", "RECEPTIONIST"];

export const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge, roles: all },
  { label: "Customers", path: "/customers", icon: Users, roles: all },
  { label: "Repairs", path: "/repair", icon: ClipboardList, roles: operations },
  { label: "Estimates", path: "/repair/estimates", icon: ShieldCheck, roles: operations },
  { label: "Parts Usage", path: "/repair/parts-usage", icon: Wrench, roles: operations },
  { label: "Assignments", path: "/assignments", icon: UserRoundCog, roles: ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"] },
  { label: "Inventory", path: "/inventory", icon: Boxes, roles: all },
  { label: "Billing", path: "/billing", icon: CreditCard, roles: finance },
  { label: "Vendors", path: "/vendors", icon: BriefcaseBusiness, roles: ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"] },
  { label: "Handover", path: "/handover", icon: Handshake, roles: all },
  { label: "Analytics", path: "/analytics", icon: BarChart3, roles: ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT"] },
];
