import type { Metadata } from "next";
import StudyApp from "../components/StudyApp";

export const metadata: Metadata = {
  title: "Social Threat Lab · WebXR study prototype",
  description: "A minimal WebXR social-agent threat scene with a realtime top-down VDO.Ninja companion view.",
};

export default function Home() {
  return <StudyApp />;
}
