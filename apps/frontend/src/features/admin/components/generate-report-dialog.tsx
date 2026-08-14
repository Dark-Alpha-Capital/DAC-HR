import * as React from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ReportType = "full" | "custom" | "last3days" | "lastWeek" | "lastMonth";

export default function GenerateReportDialog() {
  const [open, setOpen] = React.useState(false);
  const [reportType, setReportType] = React.useState<ReportType>("full");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = async () => {
    // Validate custom date range
    if (reportType === "custom") {
      if (!startDate || !endDate) {
        toast.error("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Start date must be before end date");
        return;
      }
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/audit-logs/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType,
          startDate: reportType === "custom" ? startDate : undefined,
          endDate: reportType === "custom" ? endDate : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate report");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report generated successfully");
      setOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate report",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Download className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Audit Log Report</DialogTitle>
          <DialogDescription>
            Select the time period for the audit log report. The report will be
            generated as a PDF and downloaded automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
            >
              <SelectTrigger id="reportType">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Report (All Records)</SelectItem>
                <SelectItem value="last3days">Last 3 Days</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "custom" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
          )}

          {reportType !== "custom" && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {reportType === "full" && (
                <p>
                  This will include all audit log entries from the beginning.
                </p>
              )}
              {reportType === "last3days" && (
                <p>This will include audit log entries from the last 3 days.</p>
              )}
              {reportType === "lastWeek" && (
                <p>This will include audit log entries from the last 7 days.</p>
              )}
              {reportType === "lastMonth" && (
                <p>
                  This will include audit log entries from the last 30 days.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
