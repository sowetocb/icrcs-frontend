import type { Metadata } from "next";
import ProfileView from "./profileView";

export const metadata: Metadata = {
  title: "My Profile — CRCS Tanzania",
  description: "View and update your CRCS profile details and photo.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
