"use client"

import { Button, Box } from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JobState, JobStatus } from "@/types/editor";
import ControlsContainer from "@/components/ControlsContainer";

type Props = {
  taskId: number | null;
  jobStatus: JobStatus | null;
}

export default function GenerateVideo({ taskId, jobStatus }: Props) {
  const queryClient = useQueryClient();

  const generateVideoMutation = useMutation({
    mutationFn: () => {
      toast.info("Starting upload...");
      return fetch(`/api/run/${taskId}`, {
        method: "POST",
      });
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
      <Button disabled={jobStatus?.state != JobState.READY} variant="contained" onClick={() => generateVideoMutation.mutate()}>Generate Video</Button>
    </ControlsContainer>
  )
}

