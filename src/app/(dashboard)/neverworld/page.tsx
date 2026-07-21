import { redirect } from "next/navigation";

/** Neverworld is retired — send old links to Dungeons and Dogs. */
export default function NeverworldPage() {
  redirect("/true-grit");
}
