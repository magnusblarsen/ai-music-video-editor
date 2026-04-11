"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box } from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JobState, JobStatus, Task } from "@/types/editor";
import ControlsContainer from "@/components/ControlsContainer";
import axios from "axios";

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
      setOpen(false);
      const form = new FormData();
      form.append("file", file);

      const { data } = await axios.post("/api/upload-audio", form)

      return data
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
      toast.success("Upload successful! Task created with ID: " + data.task_id);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await axios.delete(`/api/tasks/${taskId}`);
      return response.data
    },
    onSuccess: () => {
      toast.success("Project deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
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
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Create new project
        </Button>
        <Button variant="outlined" color="error" onClick={() => deleteMutation.mutate(chosenTask!.id)}>
          Delete project
        </Button>
      </Box>
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
        <Typography variant="body1" color={jobStatus.state === "failed" ? "error" : "textPrimary"}>
          Status: {stateToLabel[jobStatus.state]}
        </Typography>
      )}
      {jobStatus?.state == JobState.FAILED && jobStatus?.error && (
        <Typography color="error">
          Message: {jobStatus.error}
        </Typography>
      )}
    </ControlsContainer>

  )
}
