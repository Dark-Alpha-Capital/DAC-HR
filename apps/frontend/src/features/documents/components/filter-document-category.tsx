import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";
import type { DocumentCategory } from "@workspace/db/schema";

const FilterDocumentCategory = ({
  categories,
}: {
  categories: DocumentCategory[];
}) => (
  <MultiSelectFilter
    param="category"
    label="Category"
    filterLabel="Filter by Category"
    options={categories.map((category) => ({
      value: category.id,
      label: category.name,
    }))}
    emptyText="No categories available"
    removableBadges
  />
);

export default FilterDocumentCategory;
