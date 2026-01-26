"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";
import DocumentUploadForm from "../forms/document-upload-form";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { getAllCategories } from "@/lib/actions/document-category-actions";

export default async function AddDocumentDialog() {
  const categoriesResult = await getAllCategories();
  if (!categoriesResult.success) {
    return <div>Error loading categories</div>;
  }
  const categories = categoriesResult.data;
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">Add Document</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Upload a document to the system. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <DocumentUploadForm categories={categories} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary">Add Document</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Add Document</DrawerTitle>
          <DrawerDescription>
            Upload a document to the system. Click save when you&apos;re done.
          </DrawerDescription>
        </DrawerHeader>
        <DocumentUploadForm categories={categories} />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
