import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserContent />
      </Suspense>
    </div>
  );
}

async function UserContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/signup");
  }
  return <h1>Welcome {JSON.stringify(session)}</h1>;
}
