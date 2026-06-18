import type { Metadata } from "next";
import AuthShell from "@/components/auth/authShell";
import LoginForm from "./loginForm";

export const metadata: Metadata = {
  title: "Sign In — ICRCS Tanzania",
  description:
    "Sovereign Access to the Integrated Citizen Registry and Control System.",
};

export default function LoginPage() {
  return (
    <AuthShell showStatusCheck>
      <LoginForm />
    </AuthShell>
  );
}
