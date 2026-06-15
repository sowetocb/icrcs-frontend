import { redirect } from "next/navigation";

// The application entry point is the institutional sign-in screen.
export default function Home() {
  redirect("/login");
}
