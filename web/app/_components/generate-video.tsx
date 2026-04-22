"use client"

import { Button, TextField, Typography } from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JobState, JobStatus, Task } from "@/types/editor";
import ControlsContainer from "@/components/ControlsContainer";
import { useState } from "react";
import axios from "axios";

type Props = {
  taskId: number | null;
  jobStatus: JobStatus | null;
  task: Task | undefined;
}

export default function GenerateVideo({ taskId, jobStatus, task }: Props) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(task?.additional_prompt || "");

  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      toast.info("Starting upload...");
      const response = await axios.post(`/api/run/${taskId}`, {
        additional_prompt: text,
      })

      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["status", taskId],
      })
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    }
  })

  return (
    <ControlsContainer>
      <Typography variant="body2">Step 2: You can optionally place cut markers in the timeline below, and/or add an a prompt to influence the story of the generated video.</Typography>
      <Typography variant="body2">Step 3: Click &quot;generate video&quot; to start generating it.</Typography>
      <Button disabled={!(jobStatus?.state == JobState.READY || jobStatus?.state == JobState.FAILED)} variant="contained" onClick={() => generateVideoMutation.mutate()}>Generate Video</Button>
      <TextField
        label="Additional prompt (optional)"
        multiline
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        fullWidth
      />
    </ControlsContainer>
  )
}

