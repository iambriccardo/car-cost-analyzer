import clsx from "clsx";
import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import type { FieldConfig } from "../app/field-config";
import { Tooltip } from "./Tooltip";

type Props = {
  field: FieldConfig;
  value: string | number | boolean;
  error?: string;
  onChange: (value: string | number | boolean) => void;
};

const baseInputClass =
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30";

export function FieldControl({ field, value, error, onChange }: Props) {
  const [draftValue, setDraftValue] = useState(
    field.type === "number" && typeof value === "number" ? String(value) : ""
  );

  useEffect(() => {
    if (field.type === "number" && typeof value === "number" && Number.isFinite(value)) {
      setDraftValue(String(value));
    }
  }, [field.type, value]);

  return (
    <label className="block self-start rounded-[24px] border border-white/10 bg-white/4 p-3 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-white">{field.label}</div>
          <Tooltip content={field.help}>
            <button
              type="button"
              aria-label={`Explain ${field.label}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-white/55 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
              onClick={(event) => event.preventDefault()}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {field.advanced ? (
            <span className="rounded-full bg-accent-900/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-100">
              Advanced
            </span>
          ) : null}
          {"suffix" in field && field.suffix ? (
            <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-semibold text-white/72">
              {field.suffix}
            </span>
          ) : null}
        </div>
      </div>

      {field.type === "number" ? (
        <input
          className={clsx(baseInputClass, error && "border-rose bg-rose/10")}
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
        <input
          className={clsx(baseInputClass, error && "border-rose bg-rose/10")}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "toggle" ? (
        <button
          type="button"
          className={clsx(
            "mt-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition",
            value
              ? "bg-accent-600 text-white"
              : "bg-white/8 text-white/75"
          )}
          onClick={() => onChange(!value)}
        >
          {value ? "Enabled" : "Disabled"}
        </button>
      ) : null}

      {field.type === "select" ? (
        <select
          className={clsx(baseInputClass, error && "border-rose bg-rose/10")}
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

      {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
    </label>
  );
}
