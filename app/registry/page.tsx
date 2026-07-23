import type { Metadata } from "next";
import RegistryClient from "./registryClient";

export const metadata: Metadata = {
  title: "Registration — CRCS Tanzania",
  description:
    "Citizen Registry — complete your national digital identity registration.",
};

export default function RegistryPage() {
  return <RegistryClient />;
}
