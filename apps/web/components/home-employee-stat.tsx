import { getEmployees } from "@workspace/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { UserCheck } from "lucide-react";

export default async function HomeEmployeeStat() {
  const employees = await getEmployees();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Employees</CardTitle>
        <UserCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{employees.length}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Total employees
        </p>
      </CardContent>
    </Card>
  );
}

