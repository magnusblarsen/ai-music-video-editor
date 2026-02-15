"use client";

import InputContainer from "@/components/input-container";
import { Box, Button, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function UploadFile() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);


  const handleSelectClick = () => {
    inputRef.current?.click();
  }

  async function upload() {
    toast.info("Starting upload...");
    if (!file) return;

    setBusy(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: form
      });

      const data = await res.json().catch(() => { })

      if (!res.ok) {
        throw new Error(data?.error || `Upload failed with status ${res.status}`);
      }

      setResult(data);
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>

      <InputContainer label="Upload audio file" float="top">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="contained" onClick={handleSelectClick}>
          {file ? "Change file" : "Select file"}
        </Button>

        {file && (
          <Typography variant="body2">
            Selected: {file.name}
          </Typography>
        )}

        <Button variant="outlined" onClick={upload} disabled={!file || busy}>
          {busy ? "Uploading..." : "Upload"}
        </Button>

      </InputContainer>

      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
