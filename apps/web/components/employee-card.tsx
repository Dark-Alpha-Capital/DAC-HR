import React from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Eye, Pencil, Briefcase } from "lucide-react";
import DeleteEmployeeButton from "./delete-employee-button";
import EmployeeProfileImage from "./employee-profile-image";

interface EmployeeCardProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    profileImage?: string | null;
    position?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

const EmployeeCard = ({ employee }: EmployeeCardProps) => {
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{fullName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {employee.profileImage && (
            <div className="flex justify-center">
              <EmployeeProfileImage
                imageUrl={employee.profileImage}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {employee.department.charAt(0).toUpperCase() +
                  employee.department.slice(1).replace("-", " ")}
              </Badge>
            </div>
            {employee.position && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span className="text-xs">{employee.position.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={{
                pathname: `/employees/${employee.id}`,
              }}
            >
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={{
                pathname: `/employees/${employee.id}/edit`,
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteEmployeeButton employeeId={employee.id} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default EmployeeCard;
