import type { ReactNode } from "react";
import { Tabs } from "#/components/ui/tabs";

export default function CandidateTabsClient({
  children,
  defaultValue = "overview",
}: {
  children: ReactNode;
  defaultValue?: string;
}) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      {children}
    </Tabs>
  );
}
