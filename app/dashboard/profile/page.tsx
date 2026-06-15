import type { Metadata } from "next";
import ProfileView from "./profileView";

export const metadata: Metadata = {
  title: "My Profile — ICRCS Tanzania",
  description: "View and update your ICRCS profile details and photo.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
