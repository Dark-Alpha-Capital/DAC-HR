import { auth } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";
import { headers } from "next/headers";

const UserAuthenticated = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <></>;
};

const UserIsAdmin = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return <></>;
};

export { UserAuthenticated, UserIsAdmin };
