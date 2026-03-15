"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JobState, JobStatus, Task } from "@/types/editor";
import ControlsContainer from "@/components/ControlsContainer";

const stateToLabel: Record<JobState, string> = {
  "started": "The task has started",
  "staging": "Uploading audio file",
  "ready": "Ready to start generating videos",
  "running": "Making video scripts",
  "videos_segmented": "Video scripts have been generated. Generating videos now :)",
  "done": "Done generating videos",
  "failed": "Failed. Sadness :("
}


type UploadFileProps = {
  file: File | null;
  setFileAction: (file: File | null) => void;
  jobStatus: JobStatus | null;
  onProjectSelect: (event: SelectChangeEvent<number>) => void;
  tasks: Task[] | null;
  chosenTask: Task | null;
}

export default function UploadFile({ file, setFileAction, jobStatus, onProjectSelect, tasks, chosenTask }: UploadFileProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
      queryClient.invalidateQueries({
        queryKey: ["status", data.task_id],
      })
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  })


  return (
    <ControlsContainer>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => setFileAction(e.target.files?.[0] ?? null)}
      />
      <FormControl fullWidth>
        <InputLabel>Project</InputLabel>
        <Select
          value={chosenTask?.id || ""}
          label="Project"
          onChange={onProjectSelect}
        >
          {tasks?.map((task) => (
            <MenuItem key={task.id} value={task.id}>
              {task.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Create new project
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Upload audio file to make new project</DialogTitle>
        <DialogContent>

          {file && (
            <Typography variant="body2">
              Selected: {file.name}
            </Typography>
          )}

          <DialogActions>
            <Button variant="contained" onClick={handleSelectClick}>
              {file ? "Change audio file" : "Select audio file"}
            </Button>

            <Button variant="outlined" onClick={() => file && uploadMutation.mutate(file)} disabled={!file || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogActions>

        </DialogContent>

      </Dialog>
      {jobStatus && (
        <Typography variant="body1" color={jobStatus.state === "failed" ? "error" : "textPrimary"} gutterBottom>
          Status: {stateToLabel[jobStatus.state]}
        </Typography>
      )}
    </ControlsContainer>

  )
}
