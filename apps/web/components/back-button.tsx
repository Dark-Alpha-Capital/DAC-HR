import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

const BackButton = () => {
  const router = useRouter();
  const handleBack = () => {
    window.history.back();
  };
  return (
    <Button variant="secondary" size="sm" onClick={handleBack}>
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
};

export default BackButton;
