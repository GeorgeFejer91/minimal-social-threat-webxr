import type { Metadata } from "next";
import StudyApp from "../components/StudyApp";

export const metadata: Metadata = {
  title: "Social Threat Lab · phone-first 2D study prototype",
  description: "A playable 2D social-agent threat trial for phones and browsers, with optional WebXR and a realtime VDO.Ninja companion view.",
};

export default function Home() {
  return <StudyApp />;
}
