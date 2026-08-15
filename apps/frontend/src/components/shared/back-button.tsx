import React from "react";
import { Button } from "#/components/ui/button";
import { ArrowLeft } from "lucide-react";

const BackButton = () => {
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
