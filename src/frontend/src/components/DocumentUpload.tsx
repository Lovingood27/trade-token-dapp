import type { TokenId } from "@/backend";
import { useAttachDocument } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { ExternalBlob } from "@caffeineai/object-storage";
import { FileText, Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx";
const MAX_BYTES = 10 * 1024 * 1024;

interface PendingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attach supporting invoice / purchase-order documents to a created token.
 * Files upload through platform object storage with live progress feedback.
 */
export function DocumentUpload({
  tokenId,
  className,
}: {
  tokenId: TokenId;
  className?: string;
}) {
  const attach = useAttachDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);

  const updateFile = (id: string, patch: Partial<PendingFile>) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...patch } : file)),
    );
  };

  const uploadOne = async (file: File, id: string) => {
    if (file.size > MAX_BYTES) {
      updateFile(id, {
        status: "error",
        error: "File exceeds the 10 MB limit.",
      });
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(
        bytes,
        file.type || "application/octet-stream",
        file.name,
      ).withUploadProgress((percentage) => {
        updateFile(id, { progress: Math.round(percentage) });
      });

      // The platform object-storage layer serializes the ExternalBlob reference;
      // the generated binding types the parameter as the raw blob bytes.
      const result = await attach.mutateAsync({
        tokenId,
        file: blob as unknown as Uint8Array,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });

      if (result.__kind__ === "err") {
        updateFile(id, {
          status: "error",
          error: "The canister rejected this document.",
        });
        return;
      }
      updateFile(id, { status: "done", progress: 100 });
    } catch {
      updateFile(id, {
        status: "error",
        error: "Upload failed. Please try again.",
      });
    }
  };

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const queued: PendingFile[] = incoming.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    }));
    setFiles((current) => [...current, ...queued]);
    queued.forEach((entry, index) => {
      void uploadOne(incoming[index], entry.id);
    });
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        data-ocid="issue.dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-smooth",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50",
        )}
      >
        <Paperclip
          className="size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-foreground">
          Drag invoice or purchase-order files here
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, image or office document · up to 10 MB each
        </p>
        <button
          type="button"
          data-ocid="issue.upload_button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Upload className="size-4" aria-hidden="true" />
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          data-ocid="issue.file_input"
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul data-ocid="issue.upload_list" className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={file.id}
              data-ocid={`issue.upload_item.${index + 1}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
            >
              <FileText
                className="size-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                {file.status === "uploading" && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      tabIndex={0}
                      aria-valuenow={file.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Uploading ${file.name}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="font-numeric text-xs text-muted-foreground">
                      {file.progress}%
                    </span>
                  </div>
                )}
                {file.status === "done" && (
                  <p className="mt-0.5 text-xs text-primary">
                    Attached · {formatBytes(file.size)}
                  </p>
                )}
                {file.status === "error" && (
                  <p
                    role="alert"
                    data-ocid={`issue.upload_error.${index + 1}`}
                    className="mt-0.5 text-xs text-destructive"
                  >
                    {file.error}
                  </p>
                )}
              </div>
              <button
                type="button"
                data-ocid={`issue.upload_remove_button.${index + 1}`}
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(file.id)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
