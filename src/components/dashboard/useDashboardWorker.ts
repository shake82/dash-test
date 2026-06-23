import { useEffect, useRef, useState } from "react";
import type {
  DashboardWorkerInMessage,
  DashboardWorkerOutMessage,
  WorkerLoadProgress,
  WorkerStatePayload,
} from "@/lib/dashboardTypes";
import type { LoadStatus } from "./formatters";

const emptyProgress: WorkerLoadProgress = {
  receivedBytes: 0,
  totalBytes: null,
  percent: null,
  stage: "connecting",
};

export function useDashboardWorker(dataUrl: string) {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [progress, setProgress] = useState<WorkerLoadProgress>(emptyProgress);
  const [dashboardState, setDashboardState] = useState<WorkerStatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../../lib/filterWorker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<DashboardWorkerOutMessage>) => {
      const message = event.data;

      if (message.type === "progress") {
        setProgress(message.payload);
        return;
      }

      if (message.type === "ready" || message.type === "state") {
        setDashboardState(message.payload);
        setStatus("ready");
        return;
      }

      if (message.type === "error") {
        setError(message.payload.message);
        setStatus("error");
      }
    };

    postToWorker(worker, { type: "load", url: dataUrl });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [dataUrl]);

  const send = (message: DashboardWorkerInMessage) => {
    postToWorker(workerRef.current, message);
  };

  return { dashboardState, error, progress, send, status };
}

function postToWorker(worker: Worker | null, message: DashboardWorkerInMessage) {
  worker?.postMessage(message);
}
