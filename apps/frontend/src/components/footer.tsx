import React from "react";
import { ModeToggle } from "./mode-toggle";

const Footer = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <ModeToggle />
      </div>
    </footer>
  );
};

export default Footer;
