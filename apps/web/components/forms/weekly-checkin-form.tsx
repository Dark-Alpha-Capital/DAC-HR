import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
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
} from "@/lib/schemas/weekly-checkin-form-schema";
import { createWeeklyCheckin } from "@/lib/actions/create-weekly-checkin";

interface WeeklyCheckinFormProps {
  positions: {
    id: string;
    name: string;
  }[];
  userName?: string;
}

export default function WeeklyCheckinForm({
  positions,
  userName,
}: WeeklyCheckinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("week-info");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

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
      positionsWorked: [] as string[],
      candidatesSourced: 0,
      candidatesScreened: 0,
      candidatesRejected: 0,
      candidatesAdvanced2ndRound: 0,
      candidatesAdvanced3rdRound: 0,
      offersExtended: 0,
      offersAccepted: 0,
      bestPerformingChannels: [] as string[],
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
            ...value,
            positionsWorked: selectedPositions,
            bestPerformingChannels: selectedChannels as any,
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

  const togglePosition = (positionId: string) => {
    setSelectedPositions((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId],
    );
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
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
              setSelectedPositions([]);
              setSelectedChannels([]);
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
                        checked={selectedPositions.includes(position.id)}
                        onCheckedChange={() => togglePosition(position.id)}
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
                <form.Field
                  name="candidatesSourced"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Candidates Sourced/Shortlisted
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

                <form.Field
                  name="candidatesScreened"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Candidates Screened
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

                <form.Field
                  name="candidatesRejected"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Candidates Rejected
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

                <form.Field
                  name="candidatesAdvanced2ndRound"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Advanced to 2nd Round
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

                <form.Field
                  name="candidatesAdvanced3rdRound"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Advanced to 3rd Round
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

                <form.Field
                  name="offersExtended"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Offers Extended
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

                <form.Field
                  name="offersAccepted"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Offers Accepted
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
                        checked={selectedChannels.includes(channel)}
                        onCheckedChange={() => toggleChannel(channel)}
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
              <form.Field
                name="delaysOrBottlenecks"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Delays or Bottlenecks Noticed
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Describe any delays or bottlenecks you encountered this week..."
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

              <form.Field
                name="concernsOrEscalations"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Any Concerns or Escalations
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Note any concerns or issues that need escalation..."
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

              <form.Field
                name="supportNeeded"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Support Needed for Next Week
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Describe any support or resources you need for next week..."
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
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
