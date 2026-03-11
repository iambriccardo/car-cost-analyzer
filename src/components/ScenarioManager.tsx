import { Download, FileUp, Plus, Trash2, Copy, PencilLine, FileText } from "lucide-react";
import type { SavedScenario } from "../lib/types";

type Props = {
  scenarios: SavedScenario[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExportConfig: () => void;
  onExportPdf: () => void;
  onImport: (file: File) => void;
};

export function ScenarioManager({
  scenarios,
  selectedId,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onExportConfig,
  onExportPdf,
  onImport
}: Props) {
  return (
    <div className="rounded-[32px] border border-ink-200/70 bg-white/85 p-5 text-ink-900 shadow-panel backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-ink-500 dark:text-white/50">
            Scenario library
          </div>
          <div className="mt-2 font-display text-2xl">Scenarios and exports</div>
          <div className="mt-2 max-w-2xl text-sm leading-6 text-ink-600 dark:text-white/65">
            Use one saved scenario as the active configuration and export either the raw configuration or the audit PDF.
          </div>
        </div>
        <button
          type="button"
          className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink-900"
          onClick={onCreate}
        >
          <Plus className="mr-2 inline h-4 w-4" />
          New
        </button>
      </div>

      <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
        {scenarios.map((scenario) => {
          const active = scenario.id === selectedId;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`w-full self-start rounded-3xl border px-4 py-4 text-left transition ${
                active
                  ? "border-accent-400 bg-accent-50 dark:bg-accent-900/20"
                  : "border-ink-200/70 bg-ink-50 dark:border-white/10 dark:bg-white/5"
              }`}
              onClick={() => onSelect(scenario.id)}
            >
              <div>
                <div className="font-semibold">{scenario.name}</div>
                <div className="mt-1 text-xs text-ink-600 dark:text-white/60">{scenario.notes}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <ActionButton label="Duplicate" icon={<Copy className="h-4 w-4" />} onClick={onDuplicate} />
        <ActionButton label="Rename" icon={<PencilLine className="h-4 w-4" />} onClick={onRename} />
        <ActionButton label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} />
        <ActionButton label="Config" icon={<Download className="h-4 w-4" />} onClick={onExportConfig} />
        <ActionButton label="PDF" icon={<FileText className="h-4 w-4" />} onClick={onExportPdf} />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-900 dark:bg-white/10 dark:text-white">
          <FileUp className="h-4 w-4" />
          Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-900 dark:bg-white/10 dark:text-white"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
