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
  isExportingPdf?: boolean;
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
  isExportingPdf = false,
  onImport
}: Props) {
  const activeScenario =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-white/45">
            Active scenario
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink-900"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {scenarios.map((scenario) => {
            const active = scenario.id === selectedId;
            return (
              <button
                key={scenario.id}
                type="button"
                className={`w-full self-start rounded-[26px] border px-4 py-4 text-left transition ${
                  active
                    ? "border-accent-300/65 bg-accent-900/15 shadow-[inset_0_0_0_1px_rgba(141,211,190,0.12)]"
                    : "border-white/10 bg-white/4 hover:bg-white/6"
                }`}
                onClick={() => onSelect(scenario.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">
                      {scenario.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm leading-6 text-white/62">
                      {scenario.notes}
                    </div>
                  </div>
                  {active ? (
                    <span className="rounded-full bg-accent-300/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-100">
                      Live
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/4 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Current profile
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/68">
            <span>{activeScenario.name}</span>
            <span>{scenarios.length} saved</span>
            <span>PDF + config export</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 self-start sm:grid-cols-2 xl:grid-cols-1">
        <ActionGroup title="Manage">
          <ActionButton label="Duplicate" icon={<Copy className="h-4 w-4" />} onClick={onDuplicate} />
          <ActionButton label="Rename" icon={<PencilLine className="h-4 w-4" />} onClick={onRename} />
          <ActionButton label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} />
        </ActionGroup>

        <ActionGroup title="Export">
          <ActionButton label="Config" icon={<Download className="h-4 w-4" />} onClick={onExportConfig} />
          <ActionButton
            label={isExportingPdf ? "Exporting..." : "PDF"}
            icon={<FileText className="h-4 w-4" />}
            onClick={onExportPdf}
            disabled={isExportingPdf}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/8">
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
        </ActionGroup>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionGroup({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/4 p-3.5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {title}
      </div>
      <div className="flex flex-wrap gap-2 xl:flex-col">
        {children}
      </div>
    </div>
  );
}
