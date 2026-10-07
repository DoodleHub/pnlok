import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics-view";
import { getAccounts } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pnlok · Analytics" };

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const accounts = await getAccounts();
  if (accounts.length === 0) redirect("/");

  const email = data.claims.email ?? "";
  const { account } = await searchParams;
  return (
    <AnalyticsView
      accounts={accounts}
      initialAccountId={typeof account === "string" ? account : undefined}
      userEmail={email}
      userInitial={(email[0] ?? "?").toUpperCase()}
    />
  );
}
