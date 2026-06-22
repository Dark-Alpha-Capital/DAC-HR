import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ClipboardList, Mic } from "lucide-react";

interface DeliveryModePickerProps {
  onSelectForm: () => void;
  onSelectVoice: () => void;
}

export default function DeliveryModePicker({
  onSelectForm,
  onSelectVoice,
}: DeliveryModePickerProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Choose interview mode</CardTitle>
        <CardDescription>
          Pick one mode for this session. You cannot switch after starting.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4"
          onClick={onSelectForm}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="font-medium">Form interview</span>
          <span className="text-xs text-muted-foreground text-left">
            Type answers and select MCQ options at your own pace.
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-2 p-4"
          onClick={onSelectVoice}
        >
          <Mic className="h-5 w-5" />
          <span className="font-medium">Voice interview</span>
          <span className="text-xs text-muted-foreground text-left">
            Speak with the AI interviewer in real time with fullscreen focus.
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
