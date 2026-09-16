import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { Brand } from "@/components/ui";

export default function NotFound({ go }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))] p-6 text-center">
      <div>
        <Brand />
        <h1 className="mt-7 font-display text-5xl font-bold">Signal not found.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
          This path is outside the demo workspace.
        </p>
        <Button onClick={() => go("/")} className="mt-7" testId="button-back-home">
          Back to home <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}
