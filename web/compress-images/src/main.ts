import {
  buildOutputFilename,
  formatBytes,
  savingsPercent,
} from "./core/format";
import {
  FORMAT_EXTENSIONS,
  type EncodeOptions,
  type EncodeRequest,
  type EncodeResponse,
  type EncoderKind,
  type OutputFormat,
} from "./core/types";

/** Lifecycle of one file in the queue. */
type ItemStatus = "queued" | "processing" | "done" | "failed";

/** State of a single file the user dropped. */
interface Item {
  id: string;
  file: File;
  status: ItemStatus;
  outputName?: string;
  blob?: Blob;
  error?: string;
}

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

/** Pending worker requests, keyed by correlation id. */
const pending = new Map<string, (response: EncodeResponse) => void>();
let nextId = 0;

const items: Item[] = [];

const dropzone = document.querySelector<HTMLDivElement>("#dropzone")!;
const fileInput = document.querySelector<HTMLInputElement>("#file-input")!;
const encoderSelect = document.querySelector<HTMLSelectElement>("#encoder")!;
const formatSelect = document.querySelector<HTMLSelectElement>("#format")!;
const qualityInput = document.querySelector<HTMLInputElement>("#quality")!;
const qualityValue = document.querySelector<HTMLOutputElement>("#quality-value")!;
const maxWidthInput = document.querySelector<HTMLInputElement>("#max-width")!;
const recompressButton = document.querySelector<HTMLButtonElement>("#recompress")!;
const resultsSection = document.querySelector<HTMLElement>("#results")!;
const itemList = document.querySelector<HTMLUListElement>("#item-list")!;
const downloadAllButton = document.querySelector<HTMLButtonElement>("#download-all")!;

worker.onmessage = (event: MessageEvent<EncodeResponse>) => {
  const resolve = pending.get(event.data.id);
  pending.delete(event.data.id);
  resolve?.(event.data);
};

/**
 * Sends one encode job to the worker and resolves with its response.
 * Requests are correlated by id; callers process sequentially, so a single
 * worker keeps the UI responsive without flooding it.
 */
function encodeViaWorker(file: Blob, options: EncodeOptions): Promise<EncodeResponse> {
  const id = String(++nextId);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ id, file, options } satisfies EncodeRequest);
  });
}

/** Reads the current control values as encode options. */
function readOptions(): EncodeOptions {
  const maxWidth = Number.parseInt(maxWidthInput.value, 10);
  return {
    encoder: encoderSelect.value as EncoderKind,
    format: formatSelect.value as OutputFormat,
    quality: Number(qualityInput.value),
    ...(Number.isFinite(maxWidth) && maxWidth > 0 ? { maxWidth } : {}),
  };
}

/** Adds dropped/selected files to the queue, then starts processing. */
function addFiles(files: FileList | File[]): void {
  for (const file of files) {
    items.push({ id: `file-${++nextId}`, file, status: "queued" });
  }
  void processQueue();
}

/** Encodes every queued item in order, updating state as it goes. */
async function processQueue(): Promise<void> {
  recompressButton.hidden = items.length === 0;
  for (const item of items) {
    if (item.status !== "queued") {
      continue;
    }
    item.status = "processing";
    render();

    const options = readOptions();
    const response = await encodeViaWorker(item.file, options);

    if (response.ok) {
      item.status = "done";
      item.blob = response.blob;
      item.outputName = buildOutputFilename(
        item.file.name,
        FORMAT_EXTENSIONS[options.format],
      );
    } else {
      item.status = "failed";
      item.error = response.error;
    }
    render();
  }
}

/** Resets every item back to queued and re-runs with current settings. */
function recompressAll(): void {
  for (const item of items) {
    item.status = "queued";
    item.blob = undefined;
    item.error = undefined;
  }
  void processQueue();
}

/** Triggers a browser download for the blob, revoking the URL afterwards. */
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Downloads all successfully compressed files with a small delay each. */
function downloadAll(): void {
  let delay = 0;
  for (const item of items) {
    if (item.status === "done" && item.blob && item.outputName) {
      setTimeout(() => download(item.blob!, item.outputName!), delay);
      delay += 250;
    }
  }
}

/** Builds the status line shown for one item. */
function statusText(item: Item): string {
  switch (item.status) {
    case "queued":
      return "Menunggu…";
    case "processing":
      return "Memproses…";
    case "failed":
      return item.error ?? "Gagal";
    case "done": {
      const before = item.file.size;
      const after = item.blob!.size;
      const savings = savingsPercent(before, after);
      const sign = savings >= 0 ? "−" : "+";
      return `${formatBytes(before)} → ${formatBytes(after)} (${sign}${Math.abs(savings)}%)`;
    }
  }
}

/** Re-renders the results list from current state. */
function render(): void {
  resultsSection.hidden = items.length === 0;
  downloadAllButton.hidden = !items.some((item) => item.status === "done");
  itemList.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.className = "item";

      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.file.name;
      name.title = item.file.name;

      const status = document.createElement("span");
      status.className = `item-status ${item.status}`;
      status.textContent = statusText(item);

      li.append(name, status);

      if (item.status === "done" && item.blob && item.outputName) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Download";
        button.addEventListener("click", () => download(item.blob!, item.outputName!));
        li.append(button);
      }
      return li;
    }),
  );
}

dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files) {
    addFiles(fileInput.files);
  }
  fileInput.value = "";
});
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  if (event.dataTransfer?.files.length) {
    addFiles(event.dataTransfer.files);
  }
});

qualityInput.addEventListener("input", () => {
  qualityValue.textContent = qualityInput.value;
});
recompressButton.addEventListener("click", recompressAll);
downloadAllButton.addEventListener("click", downloadAll);
