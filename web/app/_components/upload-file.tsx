"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box, FormLabel, TextField } from "@mui/material";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types/editor";
import ControlsContainer from "@/components/ControlsContainer";
import axios from "axios";



type UploadFileProps = {
  file: File | null;
  setFileAction: (file: File | null) => void;
  tasks: Task[] | null;
  chosenTask: Task | null;
  setPendingTaskId: (id: number | null) => void;
  setSelectedTaskId: (id: number | null) => void;
}

export default function UploadFile({ file, setFileAction, tasks, chosenTask, setPendingTaskId, setSelectedTaskId }: UploadFileProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [openCreateProject, setOpenCreateProject] = useState(false);
  const [openEditProject, setOpenEditProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState(chosenTask?.name || "");

  const handleSelectClick = () => {
    inputRef.current?.click();
  }


  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setOpenCreateProject(false);
      const form = new FormData();
      form.append("file", file);

      const { data } = await axios.post("/api/upload-audio", form)

      return data;
    },
    onMutate: () => {
      toast.info("Starting upload...");
    },
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({
        queryKey: ["status", data.id],
      })

      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
      toast.success("Upload successful! Task created with ID: " + data.id);
      setPendingTaskId(data.id);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  })

  const saveProjectMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!chosenTask) return
      const response = await axios.put(`/api/tasks/${chosenTask.id}`, { name: name });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Project updated successfully");
      setOpenEditProject(false)
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      })
    },
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
      <Typography variant="body2">Step 1: Upload music to create a new project (click &quot;create new project&quot;)</Typography>
      <FormControl fullWidth>
        <InputLabel>Project</InputLabel>
        <Select
          value={chosenTask?.id || ""}
          label="Project"
          onChange={(e: SelectChangeEvent<number>) => setSelectedTaskId(e.target.value)}
        >
          {tasks?.map((task) => (
            <MenuItem key={task.id} value={task.id}>
              {task.name} (id: {task.id})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="contained" onClick={() => setOpenCreateProject(true)}>
          Create new project
        </Button>
        <Button variant="outlined" onClick={() => setOpenEditProject(true)} disabled={!chosenTask}>
          Edit project
        </Button>
        <Button variant="outlined" color="error" onClick={() => deleteMutation.mutate(chosenTask!.id)}>
          Delete project
        </Button>
      </Box>
      <Dialog open={openCreateProject} onClose={() => setOpenCreateProject(false)}>
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
      <Dialog open={openEditProject} onClose={() => setOpenEditProject(false)}>
        <DialogTitle>Edit project</DialogTitle>
        <DialogContent>
          <TextField sx={{ m: 2 }} label="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => saveProjectMutation.mutate({ name: newProjectName })}>Save changes</Button>
        </DialogActions>
      </Dialog>
    </ControlsContainer>

  )
}
