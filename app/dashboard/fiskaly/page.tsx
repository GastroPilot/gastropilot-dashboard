import { redirect } from "next/navigation";

export default function LegacyFiskalyRedirectPage() {
  redirect("/dashboard/finanzen/tse");
}
