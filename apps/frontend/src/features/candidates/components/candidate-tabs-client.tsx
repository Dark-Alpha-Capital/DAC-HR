import type { ReactNode } from "react";
import { Tabs } from "~/components/ui/tabs";

export default function CandidateTabsClient({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      {children}
    </Tabs>
  );
}
