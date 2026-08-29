import {
  LayoutDashboard,
  Bot,
  ShieldAlert,
  HeartPulse,
  LineChart,
  Lightbulb,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { SectionId } from "@/lib/types";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & KPIs" },
  { id: "ai-advisor", label: "AI Advisor", icon: Bot, description: "Chat with your copilot" },
  { id: "revenue-protection", label: "Revenue Protection", icon: ShieldAlert, description: "Protect at-risk revenue" },
  { id: "inventory-health", label: "Inventory Health", icon: HeartPulse, description: "Health score & analysis" },
  { id: "forecast", label: "Forecast Center", icon: LineChart, description: "Demand & stockout predictions" },
  { id: "insights", label: "Business Insights", icon: Lightbulb, description: "AI weekly report" },
  { id: "alerts", label: "Alerts", icon: Bell, description: "Critical notifications" },
  { id: "settings", label: "Settings", icon: Settings, description: "Store & preferences" },
];
