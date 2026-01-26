"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@workspace/ui/components/tabs";

interface PositionTabsClientProps {
  children: React.ReactNode;
}

export default function PositionTabsClient({
  children,
}: PositionTabsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {children}
    </Tabs>
  );
}
