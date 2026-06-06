import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "../lib/trpc";

export interface DictationProps {
  onComplete: (text: string) => void;
  disabled?: boolean;
}

export function Dictation({ onComplete, disabled }: DictationProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = trpc.dictation.transcribe.useMutation();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        setRecording(false);
        setTranscribing(true);

        try {
          const buffer = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);
          const result = await transcribe.mutateAsync({
            audio: base64,
            mimeType: "audio/webm",
          });
          if (result.text) onCompleteRef.current(result.text);
        } catch (err) {
          console.error("Dictation transcription failed:", err);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [transcribe]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // Space bar: start recording when no text input is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || transcribing) return;
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      if (!recording) void start();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (recording) stop();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [disabled, transcribing, recording, start, stop]);

  const isDisabled = disabled || transcribing;

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={isDisabled}
      title={recording ? "Stop recording (sends message)" : "Start dictation (or hold Space)"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        background: recording
          ? "var(--dec-danger, #ef4444)"
          : transcribing
            ? "var(--dec-border)"
            : "var(--dec-surface-2)",
        color: recording ? "#fff" : "var(--dec-text-muted)",
        transition: "background 0.15s, transform 0.1s",
        transform: recording ? "scale(1.1)" : "scale(1)",
      }}
    >
      {transcribing ? (
        <SpinnerIcon />
      ) : recording ? (
        <StopIcon />
      ) : (
        <MicIcon />
      )}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
