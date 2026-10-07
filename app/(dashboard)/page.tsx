import { redirect } from "next/navigation";
import { CreateAccountForm } from "@/components/create-account-form";
import { PnlDashboard } from "@/components/pnl-dashboard";
import { SubmitButton } from "@/components/submit-button";
import { getAccounts } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const email = data.claims.email ?? "";
  const userInitial = (email[0] ?? "?").toUpperCase();
  const accounts = await getAccounts();

  if (accounts.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2 px-4 py-16">
        <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Create your first account</h1>
        <p className="mb-6 text-body text-fg-secondary">
          Add a trading account, then click any day on the calendar to log its P&amp;L.
        </p>
        <CreateAccountForm />
        <form action={signOut} className="mt-8 text-body text-fg-muted">
          Signed in as {email} ·{" "}
          <SubmitButton
            className="inline-flex items-center gap-1.5 underline hover:text-fg disabled:no-underline"
            pendingLabel="Signing out…"
            spinnerClassName="size-3.5"
          >
            Sign out
          </SubmitButton>
        </form>
      </main>
    );
  }

  const { account } = await searchParams;
  return (
    <PnlDashboard
      accounts={accounts}
      serverNow={new Date()}
      userEmail={email}
      userInitial={userInitial}
      initialAccountId={typeof account === "string" ? account : undefined}
    />
  );
}
