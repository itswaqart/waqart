"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const FIGMA_HTML_SNIPPET = `<div data-type="FRAME" data-buffer="data:application/octet-stream;base64,VGhpcy1pcy1hLW1vY2stZmlnbWEgYnVmZmVy" data-metadata='{"name":"Sample Component","id":"123:456","components":[{"id":"789:101","name":"Button"}]}'></div>`;

const FALLBACK_MESSAGE = "Clipboard API requires a secure context. Preview over HTTPS or localhost.";

export default function Page() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [secure, setSecure] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const isSecure =
      typeof window !== "undefined" &&
      (window.isSecureContext || window.location.protocol === "https:" || window.location.hostname === "localhost");
    setSecure(Boolean(isSecure));

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, 3000);
  }, []);

  const copyFallback = useCallback(() => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = FIGMA_HTML_SNIPPET;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) {
        setStatus("success");
        scheduleReset();
        return true;
      }
    } catch (error) {
      console.error("Fallback copy failed", error);
    }
    setStatus("error");
    scheduleReset();
    return false;
  }, [scheduleReset]);

  const handleCopy = useCallback(async () => {
    if (!secure) {
      setStatus("error");
      scheduleReset();
      return;
    }

    try {
      const blob = new Blob([FIGMA_HTML_SNIPPET], { type: "text/html" });
      const ClipboardItemConstructor =
        typeof window !== "undefined" && "ClipboardItem" in window
          ? (window.ClipboardItem as typeof ClipboardItem)
          : undefined;

      if (!ClipboardItemConstructor) {
        throw new Error("ClipboardItem not supported");
      }

      const clipboardItem = new ClipboardItemConstructor({ "text/html": blob });
      await navigator.clipboard.write([clipboardItem]);
      setStatus("success");
      scheduleReset();
    } catch (error) {
      console.warn("ClipboardItem failed, attempting fallback", error);
      copyFallback();
    }
  }, [copyFallback, scheduleReset, secure]);

  const statusMessage = useMemo(() => {
    if (status === "success") {
      return "Copied! Paste into Figma with Cmd/Ctrl+V";
    }
    if (status === "error") {
      return secure ? "Unable to copy snippet. Try again." : FALLBACK_MESSAGE;
    }
    return "";
  }, [status, secure]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900/80 p-8 shadow-2xl ring-1 ring-slate-800">
        <h1 className="text-3xl font-semibold tracking-tight">Figma Component Preview</h1>
        <p className="mt-2 text-sm text-slate-300">
          Copy this mock component snippet and paste it directly into your Figma canvas.
        </p>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Sample Component
          </span>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium">Primary Button</h2>
              <p className="text-sm text-slate-400">48px height • 16px radius • Bold label</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!secure}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/50"
            >
              Copy for Figma
            </button>
          </div>
        </section>

        {statusMessage && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm transition ${
              status === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="sr-only" aria-hidden>
          <div id="figma-hidden-snippet" dangerouslySetInnerHTML={{ __html: FIGMA_HTML_SNIPPET }} />
        </div>
      </div>
    </main>
  );
}
