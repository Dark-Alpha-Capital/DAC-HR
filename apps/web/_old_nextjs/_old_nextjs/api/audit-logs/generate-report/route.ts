import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getAuditLogs } from "@workspace/db/repositories/audit-repository";
import jsPDF from "jspdf";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - jspdf-autotable doesn't have complete TypeScript types
import autoTable from "jspdf-autotable";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins are allowed to generate audit reports" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { startDate, endDate, reportType } = body;

    // Calculate date range based on report type
    let start: Date | undefined;
    let end: Date | undefined;

    if (reportType === "full") {
      // Full report - no date restrictions
      start = undefined;
      end = undefined;
    } else if (reportType === "custom" && startDate && endDate) {
      // Custom date range
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (reportType === "last3days") {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 3);
    } else if (reportType === "lastWeek") {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 7);
    } else if (reportType === "lastMonth") {
      end = new Date();
      start = new Date();
      start.setMonth(start.getMonth() - 1);
    } else {
      // Default to full report
      start = undefined;
      end = undefined;
    }

    // Fetch all audit logs (no pagination for reports)
    const { logs } = await getAuditLogs({
      startDate: start,
      endDate: end,
      limit: 10000, // Large limit to get all records
      page: 1,
    });

    // Generate PDF
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Audit Log Report", 14, 22);

    // Add report metadata
    doc.setFontSize(10);
    let reportInfo = "";
    if (reportType === "full") {
      reportInfo = "Report Type: Full Report (All Records)";
    } else if (reportType === "custom") {
      reportInfo = `Report Type: Custom Range (${start?.toLocaleDateString()} - ${end?.toLocaleDateString()})`;
    } else if (reportType === "last3days") {
      reportInfo = "Report Type: Last 3 Days";
    } else if (reportType === "lastWeek") {
      reportInfo = "Report Type: Last Week";
    } else if (reportType === "lastMonth") {
      reportInfo = "Report Type: Last Month";
    }

    doc.text(reportInfo, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Total Records: ${logs.length}`, 14, 40);

    // Handle empty logs
    if (logs.length === 0) {
      doc.setFontSize(12);
      doc.text("No audit log entries found for the selected period.", 14, 55);
    } else {
      // Prepare table data
      const tableData = logs.map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.userName || log.userEmail || "Unknown",
        log.action,
        log.entityType,
        log.entityId.substring(0, 12) + "...",
        log.details
          ? JSON.stringify(log.details).substring(0, 50) + "..."
          : "N/A",
      ]);

      // Add table
      autoTable(doc, {
        head: [
          [
            "Timestamp",
            "User",
            "Action",
            "Entity Type",
            "Entity ID",
            "Details",
          ],
        ],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 35 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="audit-log-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating audit log report:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
