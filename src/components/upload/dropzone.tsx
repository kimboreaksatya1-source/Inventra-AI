"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, isAcceptedFile } from "@/lib/import/parse";

export function Dropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setRejected(null);
      const file = files?.[0];
      if (!file) return;
      if (!isAcceptedFile(file)) {
        setRejected(`“${file.name}” is not a supported file. Upload a .csv or .xlsx file.`);
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          disabled && "pointer-events-none opacity-60",
          dragging
            ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
            : "border-border bg-muted/30 hover:border-teal-400 hover:bg-muted/50"
        )}
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
          {dragging ? <FileSpreadsheet className="size-7" /> : <UploadCloud className="size-7" />}
        </div>
        <p className="text-sm font-semibold text-foreground">
          {dragging ? "Drop your file to upload" : "Drag & drop your business data"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or <span className="font-medium text-teal-600">browse files</span> — CSV or Excel, up to 5 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {rejected && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{rejected}</p>
      )}
    </div>
  );
}
