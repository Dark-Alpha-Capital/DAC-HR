import React from "react";
import { Metadata } from "next";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Profile page",
};

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return redirect(`/profile/${session.user.id}` as Route);
};

export default page;
