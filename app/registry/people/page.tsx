import type { Metadata } from "next";
import PeopleList from "./peopleList";

export const metadata: Metadata = {
  title: "Registered People — CRCS Tanzania",
  description: "Everyone registered under your profile.",
};

export default function PeoplePage() {
  return <PeopleList />;
}
