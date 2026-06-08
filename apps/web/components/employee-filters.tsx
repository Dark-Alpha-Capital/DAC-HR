import React from "react";
import FilterEmployeeName from "@/components/filter-employee-name";
import FilterEmployeeEmail from "@/components/filter-employee-email";
import FilterEmployeePosition from "@/components/filter-employee-position";
import FilterEmployeeDepartment from "@/components/filter-employee-department";
import ClearEmployeeFiltersButton from "@/components/clear-employee-filters-button";

interface EmployeeFiltersProps {
  positions: {
    id: string;
    name: string;
  }[];
}

const EmployeeFilters = ({ positions }: EmployeeFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterEmployeeName />
      <FilterEmployeeEmail />
      <FilterEmployeePosition positions={positions} />
      <FilterEmployeeDepartment />
      <ClearEmployeeFiltersButton />
    </div>
  );
};

export default EmployeeFilters;
