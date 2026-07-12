import { redirect } from "next/navigation";

/** Legacy route — Neverworld lives at /downtown/neverworld. */
export default function PartyChronicleRedirect() {
  redirect("/downtown/neverworld");
}
