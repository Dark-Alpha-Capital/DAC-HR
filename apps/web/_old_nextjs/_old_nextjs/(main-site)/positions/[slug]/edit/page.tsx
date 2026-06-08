import React, { Suspense } from "react";
import { getPositionBySlug } from "@workspace/db/queries";
import PositionEditForm from "@/components/forms/position-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserIsAdmin } from "@/components/auth-checks";
import { cacheLife, cacheTag } from "next/cache";

type Params = Promise<{ slug: string }>;

const EditPositionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <Button asChild>
        <Link href="/positions">Back to Positions</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <EditPositionFormWrapper params={params} />
      </Suspense>
    </div>
  );
};

export default EditPositionPage;

// Cached function for position by slug
async function CachedPositionBySlug(slug: string) {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  return await getPositionBySlug(slug);
}

// Component (not cached) reads runtime data
const EditPositionFormWrapper = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await CachedPositionBySlug(slug);

  if (!position) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Position not found</h1>
        <p className="text-muted-foreground mb-4">
          The position you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/positions">Back to Positions</Link>
        </Button>
      </div>
    );
  }

  return <PositionEditForm position={position} />;
};
