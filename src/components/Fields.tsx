import clsx from "clsx";
import { CircleHelp } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { FieldConfig } from "../app/field-config";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Props = {
  field: FieldConfig;
  value: string | number | boolean;
  error?: string;
  onChange: (value: string | number | boolean) => void;
};

const baseInputClass = "mt-1.5";

function FieldControlComponent({ field, value, error, onChange }: Props) {
  const [draftValue, setDraftValue] = useState(
    field.type === "number" && typeof value === "number" ? String(value) : ""
  );

  useEffect(() => {
    if (field.type === "number" && typeof value === "number" && Number.isFinite(value)) {
      setDraftValue(String(value));
    }
  }, [field.type, value]);

  return (
    <Card className="self-start rounded-[16px]">
      <CardContent className="p-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="text-[12px] font-medium text-foreground">{field.label}</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Explain ${field.label}`}
                  className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  onClick={(event) => event.preventDefault()}
                >
                  <CircleHelp className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs leading-5">
                {field.help}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {"suffix" in field && field.suffix ? (
              <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold">
                {field.suffix}
              </Badge>
            ) : null}
          </div>
        </div>

        {field.type === "number" ? (
          <Input
            className={clsx(baseInputClass, error && "border-destructive bg-destructive/10")}
            type="number"
            inputMode="decimal"
            value={draftValue}
            step={field.step ?? 1}
            min={field.min}
            max={field.max}
            onChange={(event) => {
              const nextValue = event.target.value;
              setDraftValue(nextValue);
              if (nextValue === "") {
                return;
              }
              const parsed = Number(nextValue);
              if (Number.isFinite(parsed)) {
                onChange(parsed);
              }
            }}
            onBlur={() => {
              if (draftValue === "") {
                setDraftValue(typeof value === "number" ? String(value) : "");
              }
            }}
          />
        ) : null}

        {field.type === "text" ? (
          <Input
            className={clsx(baseInputClass, error && "border-destructive bg-destructive/10")}
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}

        {field.type === "toggle" ? (
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-2">
            <span className="text-xs text-muted-foreground">
              {value ? "Enabled" : "Disabled"}
            </span>
            <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          </div>
        ) : null}

        {field.type === "select" ? (
          <select
            className={clsx(
              "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              error && "border-destructive bg-destructive/10"
            )}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {error ? <div className="mt-1.5 text-[11px] text-red-300">{error}</div> : null}
      </CardContent>
    </Card>
  );
}

export const FieldControl = memo(
  FieldControlComponent,
  (prev, next) =>
    prev.field === next.field &&
    prev.value === next.value &&
    prev.error === next.error
);
