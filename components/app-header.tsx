import Link from "next/link";
import type { Account } from "@/lib/pnl";
import { AccountSelect } from "./account-select";
import { ChartLine, LogoMark } from "./icons";
import { ProfileMenu } from "./profile-menu";

type Props = {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  onCreateAccount: () => void;
  onManageAccounts: () => void;
  userEmail: string;
  userInitial: string;
};

export function AppHeader({
  accounts,
  accountId,
  onAccountChange,
  onCreateAccount,
  onManageAccounts,
  userEmail,
  userInitial,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.01em] text-fg">
        <LogoMark className="size-7" />
        Pnlok
      </Link>
      <div className="flex items-center gap-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={onAccountChange} onCreate={onCreateAccount} />
        <ProfileMenu
          userEmail={userEmail}
          userInitial={userInitial}
          links={[
            {
              href: `/analytics?account=${accountId}`,
              label: "Analytics",
              icon: <ChartLine className="size-4" />,
            },
          ]}
          onManageAccounts={onManageAccounts}
        />
      </div>
    </header>
  );
}
