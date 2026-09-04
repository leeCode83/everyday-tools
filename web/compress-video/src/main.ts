import {
  buildOutputFilename,
  formatBytes,
  formatDuration,
  savingsPercent,
} from "./core/format";
import { computeTargetBitrate, TargetTooSmallError } from "./core/settings";
import type { QualityPreset } from "./core/settings";
import type {
  CancelRequest,
  CompressionOptions,
  VideoMetadata,
  WorkerMessage,
} from "./core/types";
import { probeVideoFile, supportsVideoCompression } from "./videoCompressor";

/** State of the single compression job that may be running right now. */
interface ActiveJob {
  worker: Worker;
  id: string;
  /** True once the user asked to cancel this job. */
  cancelRequested: boolean;
}

let selectedFile: File | null = null;
let metadata: VideoMetadata | null = null;
let job: ActiveJob | null = null;
let resultUrl: string | null = null;

const unsupported = el<HTMLElement>("unsupported");
const dropzone = el<HTMLElement>("dropzone");
const fileInput = el<HTMLInputElement>("file-input");
const editor = el<HTMLElement>("editor");
const fileName = el<HTMLElement>("file-name");
const fileMeta = el<HTMLElement>("file-meta");
const presetFieldset = el<HTMLElement>("preset-fieldset");
const targetFieldset = el<HTMLElement>("target-fieldset");
const targetMb = el<HTMLInputElement>("target-mb");
const targetEstimate = el<HTMLElement>("target-estimate");
const compressButton = el<HTMLButtonElement>("compress");
const progressArea = el<HTMLElement>("progress-area");
const progressLabel = el<HTMLElement>("progress-label");
const progressBar = el<HTMLElement>("progress-bar");
const cancelButton = el<HTMLButtonElement>("cancel");
const result = el<HTMLElement>("result");
const resultSummary = el<HTMLElement>("result-summary");
const download = el<HTMLAnchorElement>("download");
const errorBanner = el<HTMLElement>("error");

if (supportsVideoCompression()) {
  bindEvents();
} else {
  unsupported.hidden = false;
  dropzone.hidden = true;
}

/** Shorthand for fetching one element by id, typed. */
function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function bindEvents(): void {
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    void selectFile(event.dataTransfer?.files[0]);
  });
  fileInput.addEventListener("change", () => void selectFile(fileInput.files?.[0]));

  el<HTMLElement>("change-file").addEventListener("click", () => fileInput.click());
  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener("change", syncModeUi);
  }
  targetMb.addEventListener("input", updateTargetEstimate);
  compressButton.addEventListener("click", startCompression);
  cancelButton.addEventListener("click", () => {
    if (!job) return;
    progressLabel.textContent = "Membatalkan…";
    cancelButton.disabled = true;
    job.cancelRequested = true;
    // An AbortSignal cannot cross postMessage, so cancel by message.
    job.worker.postMessage({ id: job.id, type: "cancel" } satisfies CancelRequest);
  });
  el<HTMLElement>("compress-again").addEventListener("click", resetToEmptyState);
}

/** Reads a video, shows its summary, and reveals the settings editor. */
async function selectFile(file: File | undefined): Promise<void> {
  if (!file) return;
  hideError();

  try {
    metadata = await probeVideoFile(file);
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
    return;
  }
  selectedFile = file;

  fileName.textContent = file.name;
  fileMeta.textContent =
    `${formatBytes(metadata.sizeBytes)} · ${formatDuration(metadata.durationSeconds)}` +
    ` · ${metadata.width}×${metadata.height} px` +
    (metadata.hasAudio ? " · ada audio" : " · tanpa audio");

  dropzone.hidden = true;
  editor.hidden = false;
  syncModeUi();
}

/** Shows the option group matching the selected mode. */
function syncModeUi(): void {
  const isTarget = checkedValue("mode") === "target";
  presetFieldset.hidden = isTarget;
  targetFieldset.hidden = !isTarget;
  updateTargetEstimate();
}

/**
 * In target mode, previews the bitrate the target implies and disables the
 * compress button when the target is impossible for this video.
 */
function updateTargetEstimate(): void {
  if (checkedValue("mode") !== "target") {
    targetEstimate.textContent = "";
    compressButton.disabled = false;
    return;
  }
  const mb = Number.parseFloat(targetMb.value);
  if (!metadata || !(mb > 0)) {
    targetEstimate.textContent = "Masukkan ukuran target yang valid.";
    compressButton.disabled = true;
    return;
  }

  try {
    const bitrate = computeTargetBitrate({
      targetBytes: mb * 1024 * 1024,
      durationSeconds: metadata.durationSeconds,
      hasAudio: metadata.hasAudio,
    });
    targetEstimate.textContent =
      `≈ video ${(bitrate / 1e6).toFixed(1)} Mbps + audio 128 kbps`;
    compressButton.disabled = false;
  } catch (error) {
    targetEstimate.textContent =
      error instanceof TargetTooSmallError
        ? error.message
        : "Target tidak bisa diterapkan pada video ini.";
    compressButton.disabled = true;
  }
}

function currentOptions(): CompressionOptions {
  if (checkedValue("mode") === "target") {
    const mb = Number.parseFloat(targetMb.value);
    if (mb > 0) {
      return { mode: { kind: "target", targetBytes: mb * 1024 * 1024 } };
    }
  }
  return {
    mode: { kind: "preset", preset: checkedValue("preset") as QualityPreset },
  };
}

/** Spawns a worker and hands it the compression job. */
function startCompression(): void {
  if (!selectedFile) return;
  hideError();
  editor.hidden = true;
  progressArea.hidden = false;
  setProgress(0);

  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  job = { worker, id: crypto.randomUUID(), cancelRequested: false };
  worker.onmessage = (event: MessageEvent<WorkerMessage>) =>
    handleWorkerMessage(event.data);
  worker.onerror = () => {
    finishJob();
    showError("Terjadi kesalahan tak terduga saat mengompres.");
    editor.hidden = false;
  };
  worker.postMessage({
    id: job.id,
    file: selectedFile,
    options: currentOptions(),
  });
}

/** Routes progress updates and the final response for the active job. */
function handleWorkerMessage(message: WorkerMessage): void {
  if (!job || message.id !== job.id) return;

  if ("type" in message) {
    setProgress(message.progress);
    return;
  }

  const { cancelRequested } = job;
  finishJob();

  if (message.ok) {
    showResult(message.blob);
    return;
  }
  // A user cancellation already says so via the progress label.
  if (!cancelRequested) {
    showError(message.error);
  }
  editor.hidden = false;
}

function finishJob(): void {
  if (!job) return;
  job.worker.terminate();
  job = null;
  progressArea.hidden = true;
  cancelButton.disabled = false;
}

function setProgress(progress: number): void {
  const percent = Math.round(progress * 100);
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = `Mengompres… ${percent}%`;
}

/** Builds the download link and the before/after summary. */
function showResult(blob: Blob): void {
  if (!selectedFile) return;

  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = URL.createObjectURL(blob);
  download.href = resultUrl;
  download.download = buildOutputFilename(selectedFile.name, "mp4");

  const saved = savingsPercent(selectedFile.size, blob.size);
  const badge = document.createElement("span");
  badge.className = "savings";
  badge.textContent =
    saved > 0
      ? `hemat ${saved}%`
      : saved === 0
        ? "ukurannya sama"
        : `+${Math.abs(saved)}% lebih besar`;
  resultSummary.replaceChildren(
    document.createTextNode(
      `${formatBytes(selectedFile.size)} → ${formatBytes(blob.size)} · `,
    ),
    badge,
  );

  result.hidden = false;
}

/** Forgets the current file and returns to the drop zone. */
function resetToEmptyState(): void {
  selectedFile = null;
  metadata = null;
  fileInput.value = "";
  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }
  result.hidden = true;
  editor.hidden = true;
  dropzone.hidden = false;
}

function showError(message: string): void {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function hideError(): void {
  errorBanner.hidden = true;
}

function checkedValue(name: string): string {
  const input = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]:checked`,
  );
  return input?.value ?? "";
}
