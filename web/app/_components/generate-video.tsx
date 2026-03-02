"use client"

import { Button, Box } from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JobState, JobStatus } from "@/types/editor";

type Props = {
  taskId: string | null;
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
  console.log("state", jobStatus?.state)

  return (
    <Box className="flex flex-col items-start border-2 p-4 gap-2 rounded border-gray-300">
      <Button disabled={jobStatus?.state != JobState.READY} variant="contained" onClick={() => generateVideoMutation.mutate()}>Generate Video</Button>
    </Box >
  )
}

