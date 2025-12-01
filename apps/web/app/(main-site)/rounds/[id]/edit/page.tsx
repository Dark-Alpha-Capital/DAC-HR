import React, { Suspense } from "react";
import { getRoundById } from "@workspace/db/queries";
import BackButton from "@/components/back-button";
import RoundEditForm from "@/components/forms/round-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserIsAdmin } from "@/components/auth-checks";

type Params = Promise<{ id: string }>;

const EditRoundPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <Button asChild>
        <Link href="/rounds">Back to Rounds</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <EditRoundForm params={params} />
      </Suspense>
    </div>
  );
};

export default EditRoundPage;

const EditRoundForm = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const round = await getRoundById(id);

  if (!round) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Round not found</h1>
        <p className="text-muted-foreground mb-4">
          The round you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/rounds">Back to Rounds</Link>
        </Button>
      </div>
    );
  }

  return <RoundEditForm round={round} />;
};
