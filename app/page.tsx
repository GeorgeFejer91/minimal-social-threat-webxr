import type { Metadata } from "next";
import StudyApp from "../components/StudyApp";

export const metadata: Metadata = {
  title: "Social Threat Lab · social dyads and an approaching shadow",
  description: "A playable phone-first threat trial with a front-facing crowd of six dyads, friendly spatial tones, optional WebXR, and a realtime VDO.Ninja companion.",
};

export default function Home() {
  return <StudyApp />;
}
