import { redirect } from "next/navigation";

export default function ComparePage() {
  redirect("/places");
}
export const metadata = { title: "Compare Places | AstroScout" };
