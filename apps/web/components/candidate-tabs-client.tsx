import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React from "react";
import { Tabs } from "@/components/ui/tabs";

interface CandidateTabsClientProps {
  children: React.ReactNode;
}

export default function CandidateTabsClient({
  children,
}: CandidateTabsClientProps) {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    setSearchParams(params);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {children}
    </Tabs>
  );
}
