"use client";

import { Box, Button, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobStatus } from "@/types/editor";

type UploadFileProps = {
  onUploadedAction: (id: string) => void;
  audioId: string | null;
  file: File | null;
  setFileAction: (file: File | null) => void;
}

export default function UploadFile({ onUploadedAction, audioId, file, setFileAction }: UploadFileProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  async function fetchStatus(id: string): Promise<JobStatus> {
    const res = await fetch(`/api/status/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
    return (await res.json()) as JobStatus;
  }

  const statusQuery = useQuery({
    queryKey: ["status", audioId],
    queryFn: () => fetchStatus(audioId!),
    enabled: !!audioId,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;

      const status = query.state.data?.state;

      if (!status) return 5000;

      return ["staging", "done", "failed"].includes(status) ? false : 5000;
    },
  })

  const jobStatus = statusQuery.data ?? (audioId ? { state: "queued" } : null);


  const handleSelectClick = () => {
    inputRef.current?.click();
  }


  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: form
      });

      const data = await res.json().catch(() => { });

      if (!res.ok) {
        throw new Error(data?.error || `Upload failed with status ${res.status}`);
      }
      return data;
    },
    onMutate: () => {
      toast.info("Starting upload...");
    },
    onSuccess: (data) => {
      onUploadedAction(data.task_id);
      queryClient.invalidateQueries({
        queryKey: ["status", data.task_id],
      })
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  })


  return (
    <Box className="flex flex-col items-start border-2 p-4 gap-2 rounded border-gray-300">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => setFileAction(e.target.files?.[0] ?? null)}
      />
      <Button variant="contained" onClick={handleSelectClick}>
        {file ? "Change audio file" : "Select audio file"}
      </Button>

      {file && (
        <Typography variant="body2">
          Selected: {file.name}
        </Typography>
      )}

      <Button variant="outlined" onClick={() => file && uploadMutation.mutate(file)} disabled={!file || uploadMutation.isPending}>
        {uploadMutation.isPending ? "Uploading..." : "Upload"}
      </Button>

      {jobStatus && (
        <Typography variant="body1" color={jobStatus.state === "failed" ? "error" : "textPrimary"} gutterBottom>
          Status: {jobStatus.state}
        </Typography>
      )}
    </Box>

  )
}
