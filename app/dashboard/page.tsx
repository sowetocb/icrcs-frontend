import type { Metadata } from "next";
import DashboardHome from "./dashboardHome";

export const metadata: Metadata = {
  title: "Dashboard — ICRCS Tanzania",
  description: "Citizen dashboard — secure your national identity.",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
