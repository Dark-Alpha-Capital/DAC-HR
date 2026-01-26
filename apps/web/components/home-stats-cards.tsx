import { getDashboardStats } from "@workspace/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users, Calendar } from "lucide-react";

export default async function HomeStatsCards() {
  const stats = await getDashboardStats();

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Total Candidates
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCandidates}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.activeCandidates} active in pipeline
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Interviews Scheduled
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.interviewsScheduled}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Upcoming interviews
          </p>
        </CardContent>
      </Card>
    </>
  );
}
