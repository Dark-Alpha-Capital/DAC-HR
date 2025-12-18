"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { WorkSheet } from "xlsx";
import {
  bulkCreateCandidates,
  type BulkCandidateRow,
  type BulkCandidateValidationError,
} from "@/lib/actions/bulk-create-candidates";
import { useRouter } from "next/navigation";

interface ParsedCandidate extends BulkCandidateRow {
  _rowNumber: number;
  _errors?: BulkCandidateValidationError[];
}

export default function BulkUploadCandidatesDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>(
    []
  );
  const [validationErrors, setValidationErrors] = useState<
    Map<number, BulkCandidateValidationError[]>
  >(new Map());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];

    const fileExtension = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));

    if (
      !validTypes.includes(selectedFile.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      toast.error(
        "Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.",
        { position: "bottom-right" }
      );
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName || ""] as WorkSheet;

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet || {}, {
        header: 1,
        defval: "",
      }) as any[];

      if (jsonData.length < 2) {
        toast.error(
          "Excel file must have at least a header row and one data row.",
          {
            position: "bottom-right",
          }
        );
        return;
      }

      // Get header row (first row)
      const headers = jsonData[0] as string[];
      const headerMap: Record<string, string> = {};

      // Normalize headers (case-insensitive, trim whitespace)
      headers.forEach((header, index) => {
        const normalized = header?.toString().toLowerCase().trim() || "";
        headerMap[normalized] =
          header?.toString().trim() || `Column${index + 1}`;
      });

      // Map common header variations
      const headerMappings: Record<string, string[]> = {
        firstName: ["first name", "firstname", "first_name", "fname"],
        lastName: ["last name", "lastname", "last_name", "lname"],
        email: ["email", "e-mail", "email address"],
        phone: ["phone", "phone number", "phone_number", "mobile", "tel"],
        location: ["location", "city", "address"],
        source: ["source", "source type", "source_type"],
        sourceUrl: ["source url", "source_url", "source link", "url"],
        note: ["note", "notes", "comments", "remarks"],
        positionId: ["position id", "position_id", "position", "position name"],
      };

      const findHeaderKey = (variations: string[]): string | null => {
        for (const normalized of Object.keys(headerMap)) {
          if (variations.some((v) => normalized.includes(v))) {
            return headerMap[normalized] || null;
          }
        }
        return null as string | null;
      };

      // Parse data rows
      const candidates: ParsedCandidate[] = [];
      const errors = new Map<number, BulkCandidateValidationError[]>();

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        const rowNumber = i + 1; // 1-indexed (accounting for header)

        // Skip empty rows
        if (row.every((cell) => !cell || cell.toString().trim() === "")) {
          continue;
        }

        const candidate: ParsedCandidate = {
          _rowNumber: rowNumber,
          firstName: "",
          lastName: "",
          email: "",
        };

        // Extract data based on header mappings
        Object.entries(headerMappings).forEach(([key, variations]) => {
          const headerKey = findHeaderKey(variations);
          if (headerKey) {
            const headerIndex = headers.findIndex(
              (h) => h?.toString().trim() === headerKey
            );
            if (headerIndex >= 0 && row[headerIndex] !== undefined) {
              const value = row[headerIndex]?.toString().trim() || "";
              if (key === "positionId") {
                // Position ID might be a name, we'll handle it later
                (candidate as any)[key] = value;
              } else {
                (candidate as any)[key] = value;
              }
            }
          }
        });

        // Validate required fields
        const rowErrors: BulkCandidateValidationError[] = [];

        if (!candidate.firstName || candidate.firstName.trim() === "") {
          rowErrors.push({
            row: rowNumber,
            field: "firstName",
            message: "First name is required",
          });
        }

        if (!candidate.lastName || candidate.lastName.trim() === "") {
          rowErrors.push({
            row: rowNumber,
            field: "lastName",
            message: "Last name is required",
          });
        }

        if (!candidate.email || candidate.email.trim() === "") {
          rowErrors.push({
            row: rowNumber,
            field: "email",
            message: "Email is required",
          });
        } else {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(candidate.email)) {
            rowErrors.push({
              row: rowNumber,
              field: "email",
              message: "Invalid email format",
            });
          }
        }

        // Check for duplicate emails in the batch (frontend validation)
        if (candidate.email && candidate.email.trim() !== "") {
          const duplicateInBatch = candidates.some(
            (c) =>
              c._rowNumber !== rowNumber &&
              c.email?.toLowerCase() === candidate.email?.toLowerCase() &&
              c.email?.trim() !== ""
          );

          if (duplicateInBatch) {
            rowErrors.push({
              row: rowNumber,
              field: "email",
              message: "Duplicate email in upload file",
            });
          }
        }

        if (rowErrors.length > 0) {
          errors.set(rowNumber, rowErrors);
          candidate._errors = rowErrors;
        }

        candidates.push(candidate);
      }

      setParsedCandidates(candidates);
      setValidationErrors(errors);

      if (candidates.length === 0) {
        toast.error("No valid candidate data found in the file.", {
          position: "bottom-right",
        });
      } else {
        toast.success(
          `Parsed ${candidates.length} candidate(s). ${errors.size} row(s) have errors.`,
          { position: "bottom-right" }
        );
      }
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      toast.error("Failed to parse Excel file. Please check the file format.", {
        position: "bottom-right",
      });
    }
  };

  const handleUpload = () => {
    if (parsedCandidates.length === 0) {
      toast.error("No candidates to upload.", { position: "bottom-right" });
      return;
    }

    // Filter out rows with errors
    const validCandidates = parsedCandidates.filter(
      (c) => !c._errors || c._errors.length === 0
    );

    if (validCandidates.length === 0) {
      toast.error("Please fix all errors before uploading.", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      try {
        // Create mapping: server array index -> Excel row number
        const rowNumberMap = new Map<number, number>();
        validCandidates.forEach((candidate, index) => {
          rowNumberMap.set(index + 1, candidate._rowNumber);
        });

        // Prepare candidates for upload
        const candidatesToUpload: BulkCandidateRow[] = validCandidates.map(
          (c) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            location: c.location,
            source: c.source,
            sourceUrl: c.sourceUrl,
            note: c.note,
            positionId: c.positionId,
          })
        );

        const result = await bulkCreateCandidates(candidatesToUpload);

        if (result.success) {
          toast.success(
            `Successfully uploaded ${result.created} candidate(s).`,
            { position: "bottom-right" }
          );
          setOpen(false);
          resetDialog();
          router.refresh();
          return;
        }

        // Map server errors to Excel row numbers
        const serverErrors = new Map<number, BulkCandidateValidationError[]>();
        result.errors.forEach((error) => {
          const excelRow = rowNumberMap.get(error.row) || error.row;
          const existing = serverErrors.get(excelRow) || [];
          existing.push({ ...error, row: excelRow });
          serverErrors.set(excelRow, existing);
        });

        // Update validation errors
        setValidationErrors((prev) => {
          const merged = new Map(prev);
          serverErrors.forEach((errors, row) => {
            merged.set(row, errors);
          });
          return merged;
        });

        // Update parsed candidates with server errors
        setParsedCandidates((prev) =>
          prev.map((candidate) => {
            const errors = serverErrors.get(candidate._rowNumber);
            return errors ? { ...candidate, _errors: errors } : candidate;
          })
        );

        toast.error(
          `Upload completed with errors. ${result.created} created, ${result.failed} failed.`,
          { position: "bottom-right", duration: 5000 }
        );
      } catch (error) {
        console.error("Error uploading candidates:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to upload candidates. Please try again.",
          { position: "bottom-right" }
        );
      }
    });
  };

  const resetDialog = () => {
    setFile(null);
    setParsedCandidates([]);
    setValidationErrors(new Map());
    // Reset file input by changing key to force remount
    setFileInputKey((prev) => prev + 1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  const validCandidatesCount = parsedCandidates.filter(
    (c) => !c._errors || c._errors.length === 0
  ).length;
  const errorCount = validationErrors.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-7xl sm:w-full sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload Candidates</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls) or CSV file with candidate
            information. The file should have columns: First Name, Last Name,
            Email, Phone (optional), Location (optional), Source (optional),
            Source URL (optional), Note (optional), Position ID (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Upload File</label>
              {(file || parsedCandidates.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetDialog}
                  disabled={isPending}
                  className="h-8"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Input
                key={fileInputKey}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isPending}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Section */}
          {parsedCandidates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Total Rows</AlertTitle>
                <AlertDescription>{parsedCandidates.length}</AlertDescription>
              </Alert>
              <Alert
                variant={validCandidatesCount > 0 ? "default" : "destructive"}
              >
                {validCandidatesCount > 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>Valid</AlertTitle>
                <AlertDescription>{validCandidatesCount}</AlertDescription>
              </Alert>
              <Alert variant={errorCount > 0 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>{errorCount}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Preview Table */}
          {parsedCandidates.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <label className="text-sm font-medium mb-2">Preview</label>
              <div className="flex-1 border rounded-md overflow-auto">
                <div className="min-w-full inline-block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 min-w-16 sticky left-0 bg-background z-10 border-r">
                          Row
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          First Name
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          Last Name
                        </TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Phone</TableHead>
                        <TableHead className="min-w-[120px]">
                          Location
                        </TableHead>
                        <TableHead className="min-w-[100px]">Source</TableHead>
                        <TableHead className="min-w-[150px]">
                          Source URL
                        </TableHead>
                        <TableHead className="min-w-[150px]">Note</TableHead>
                        <TableHead className="min-w-[120px]">
                          Position ID
                        </TableHead>
                        <TableHead className="w-48 min-w-48">Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedCandidates.map((candidate) => {
                        const errors =
                          validationErrors.get(candidate._rowNumber) || [];
                        const hasErrors = errors.length > 0;

                        return (
                          <TableRow
                            key={candidate._rowNumber}
                            className={hasErrors ? "bg-destructive/10" : ""}
                          >
                            <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                              {candidate._rowNumber}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.firstName || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.lastName || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.email || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.phone || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.location || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {candidate.source || "-"}
                            </TableCell>
                            <TableCell
                              className="whitespace-nowrap max-w-[150px] truncate"
                              title={candidate.sourceUrl || undefined}
                            >
                              {candidate.sourceUrl || "-"}
                            </TableCell>
                            <TableCell
                              className="whitespace-nowrap max-w-[150px] truncate"
                              title={candidate.note || undefined}
                            >
                              {candidate.note || "-"}
                            </TableCell>
                            <TableCell
                              className="whitespace-nowrap max-w-[120px] truncate"
                              title={candidate.positionId || undefined}
                            >
                              {candidate.positionId || "-"}
                            </TableCell>
                            <TableCell>
                              {hasErrors ? (
                                <div className="space-y-1">
                                  {errors.map((error, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs text-destructive"
                                    >
                                      {error.field}: {error.message}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Valid
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              isPending ||
              parsedCandidates.length === 0 ||
              validCandidatesCount === 0
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Upload {validCandidatesCount} Candidate
                {validCandidatesCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
