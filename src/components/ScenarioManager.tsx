import { Download, FileUp, Plus, Trash2, Copy, PencilLine, FileText } from "lucide-react";
import type { SavedScenario } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

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
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1 space-y-2">
          {scenarios.map((scenario) => {
            const active = scenario.id === selectedId;
            return (
              <Card
                key={scenario.id}
                className={`w-full cursor-pointer self-start rounded-[16px] transition ${
                  active
                    ? "border-primary/40 bg-accent/30 ring-1 ring-inset ring-primary/10"
                    : "hover:bg-accent/20"
                }`}
                onClick={() => onSelect(scenario.id)}
              >
                <CardContent className="px-4 py-2.5">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {scenario.name}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button type="button" size="sm" className="rounded-full" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      <Card className="rounded-[16px]">
        <CardContent className="p-2.5">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <ActionButton label="Duplicate" icon={<Copy className="h-4 w-4" />} onClick={onDuplicate} />
            <ActionButton label="Rename" icon={<PencilLine className="h-4 w-4" />} onClick={onRename} />
            <ActionButton label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} />
            <ActionButton label="Config" icon={<Download className="h-4 w-4" />} onClick={onExportConfig} />
            <ActionButton
              label={isExportingPdf ? "Exporting..." : "PDF"}
              icon={<FileText className="h-4 w-4" />}
              onClick={onExportPdf}
              disabled={isExportingPdf}
            />
            <label className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground">
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
        </CardContent>
      </Card>
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
    <Button
      type="button"
      variant="outline"
      className="h-8 shrink-0 rounded-lg bg-background px-2.5 text-xs"
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </Button>
  );
}
