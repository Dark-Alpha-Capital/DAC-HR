import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import {
  Calendar,
  Users,
  BarChart3,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import {
  weeklyCheckinFormSchema,
  sourcingChannels,
  sourcingChannelLabels,
} from "#/features/weekly-checkin/schemas";
import { createWeeklyCheckin } from "#/features/weekly-checkin/server/mutations/create-weekly-checkin";

interface WeeklyCheckinFormProps {
  positions: {
    id: string;
    name: string;
  }[];
  userName?: string;
}

/** Pipeline tab numeric fields, rendered by one shared field renderer. */
const PIPELINE_METRICS: Array<{
  name:
    | "candidatesSourced"
    | "candidatesScreened"
    | "candidatesRejected"
    | "candidatesAdvanced2ndRound"
    | "candidatesAdvanced3rdRound"
    | "offersExtended"
    | "offersAccepted";
  label: string;
}> = [
  { name: "candidatesSourced", label: "Candidates Sourced/Shortlisted" },
  { name: "candidatesScreened", label: "Candidates Screened" },
  { name: "candidatesRejected", label: "Candidates Rejected" },
  { name: "candidatesAdvanced2ndRound", label: "Advanced to 2nd Round" },
  { name: "candidatesAdvanced3rdRound", label: "Advanced to 3rd Round" },
  { name: "offersExtended", label: "Offers Extended" },
  { name: "offersAccepted", label: "Offers Accepted" },
];

/** Notes tab textarea fields, rendered by one shared field renderer. */
const NOTE_FIELDS: Array<{
  name: "delaysOrBottlenecks" | "concernsOrEscalations" | "supportNeeded";
  label: string;
  placeholder: string;
}> = [
  {
    name: "delaysOrBottlenecks",
    label: "Delays or Bottlenecks Noticed",
    placeholder:
      "Describe any delays or bottlenecks you encountered this week...",
  },
  {
    name: "concernsOrEscalations",
    label: "Any Concerns or Escalations",
    placeholder: "Note any concerns or issues that need escalation...",
  },
  {
    name: "supportNeeded",
    label: "Support Needed for Next Week",
    placeholder: "Describe any support or resources you need for next week...",
  },
];

const toggleValue = <T,>(list: T[], value: T) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

export default function WeeklyCheckinForm({
  positions,
  userName,
}: WeeklyCheckinFormProps) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState("week-info");

  // Calculate default week range (current week)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const form = useForm({
    defaultValues: {
      weekStartDate: monday,
      weekEndDate: sunday,
      recruiterName: userName || "",
      // SAFETY: TanStack form infers the field type from this initializer, so
      // the empty array is annotated with its expected element type.
      positionsWorked: [] as string[],
      candidatesSourced: 0,
      candidatesScreened: 0,
      candidatesRejected: 0,
      candidatesAdvanced2ndRound: 0,
      candidatesAdvanced3rdRound: 0,
      offersExtended: 0,
      offersAccepted: 0,
      // SAFETY: TanStack form infers the field type from this initializer, so
      // the empty array is annotated with its expected element type.
      bestPerformingChannels: [] as (typeof sourcingChannels)[number][],
      avgTimeToScreen: "",
      delaysOrBottlenecks: "",
      concernsOrEscalations: "",
      supportNeeded: "",
    },
    validators: {
      onSubmit: weeklyCheckinFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        try {
          const result = await createWeeklyCheckin({
            data: value,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success("Weekly check-in submitted successfully", {
            description: "Your weekly report has been recorded.",
          });

          router.navigate({ to: "/dashboard" });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to submit check-in",
          );
        }
      });
    },
  });

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Weekly Check-in
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit your weekly recruiting activity report.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button type="submit" form="weekly-checkin-form" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Check-in
              </>
            )}
          </Button>
        </div>
      </div>

      <form
        id="weekly-checkin-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="week-info" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Week Info</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Channels</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: This Week's Information */}
          <TabsContent value="week-info" className="mt-6 space-y-6">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="weekStartDate"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Week Start Date
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={formatDateForInput(field.state.value)}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(new Date(e.target.value))
                          }
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />

                <form.Field
                  name="weekEndDate"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Week End Date
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={formatDateForInput(field.state.value)}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(new Date(e.target.value))
                          }
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
              </div>

              <form.Field
                name="recruiterName"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Your Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Enter your name"
                        autoComplete="name"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              <Field>
                <FieldLabel>Positions Worked On This Week</FieldLabel>
                <FieldDescription>
                  Select all positions you worked on this week
                </FieldDescription>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`position-${position.id}`}
                        checked={form.state.values.positionsWorked.includes(
                          position.id,
                        )}
                        onCheckedChange={() =>
                          form.setFieldValue(
                            "positionsWorked",
                            toggleValue(
                              form.state.values.positionsWorked,
                              position.id,
                            ),
                          )
                        }
                      />
                      <Label
                        htmlFor={`position-${position.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {position.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {positions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No positions available
                  </p>
                )}
              </Field>
            </FieldGroup>
          </TabsContent>

          {/* Tab 2: Positions in Pipeline */}
          <TabsContent value="pipeline" className="mt-6 space-y-6">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                {PIPELINE_METRICS.map((metric) => (
                  <form.Field
                    key={metric.name}
                    name={metric.name}
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          {metric.label}
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          min="0"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </Field>
                    )}
                  />
                ))}
              </div>
            </FieldGroup>
          </TabsContent>

          {/* Tab 3: Channels & Efficiency */}
          <TabsContent value="channels" className="mt-6 space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Best Performing Channels This Week</FieldLabel>
                <FieldDescription>
                  Select the channels that performed best this week
                </FieldDescription>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {sourcingChannels.map((channel) => (
                    <div key={channel} className="flex items-center space-x-2">
                      <Checkbox
                        id={`channel-${channel}`}
                        checked={form.state.values.bestPerformingChannels.includes(
                          channel,
                        )}
                        onCheckedChange={() =>
                          form.setFieldValue(
                            "bestPerformingChannels",
                            toggleValue(
                              form.state.values.bestPerformingChannels,
                              channel,
                            ),
                          )
                        }
                      />
                      <Label
                        htmlFor={`channel-${channel}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {sourcingChannelLabels[channel]}
                      </Label>
                    </div>
                  ))}
                </div>
              </Field>

              <form.Field
                name="avgTimeToScreen"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Average Time to Screen Candidate
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., 30 minutes, 1 hour"
                    />
                    <FieldDescription>
                      Enter the average time it took to screen each candidate
                    </FieldDescription>
                  </Field>
                )}
              />
            </FieldGroup>
          </TabsContent>

          {/* Tab 4: Notes & Issues */}
          <TabsContent value="notes" className="mt-6 space-y-6">
            <FieldGroup>
              {NOTE_FIELDS.map((noteField) => (
                <form.Field
                  key={noteField.name}
                  name={noteField.name}
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {noteField.label}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupTextarea
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={noteField.placeholder}
                          rows={4}
                          className="min-h-24 resize-none"
                        />
                        <InputGroupAddon align="block-end">
                          <InputGroupText className="tabular-nums">
                            {field.state.value.length}/2000
                          </InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>
                  )}
                />
              ))}
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
