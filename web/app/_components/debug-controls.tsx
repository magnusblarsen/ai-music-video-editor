import ControlsContainer from "@/components/ControlsContainer";
import { Task } from "@/types";
import { Typography, Box, Button, Switch, FormControlLabel } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

export default function DebugControls({ chosenTask }: { chosenTask: Task | null }) {
  const [showDebugControls, setShowDebugControls] = useState(false);

  const pollSegmentsMutation = useMutation({
    mutationFn: () => {
      return axios.post(`/api/tasks/${chosenTask?.id}/poll-segments`);
    },
    onError: (err) => {
      toast.error(`Failed to start polling: ${err.message}`);
    }
  })

  const pollVideosMutation = useMutation({
    mutationFn: () => {
      return axios.post(`/api/tasks/${chosenTask?.id}/poll-videos`);
    },
    onSuccess: () => {
      toast.success("Polling started successfully");
    },
    onError: (err) => {
      toast.error(`Failed to start polling: ${err.message}`);
    }
  })

  const concatenateVideosMutation = useMutation({
    mutationFn: () => {
      return axios.post(`/api/tasks/${chosenTask?.id}/concat`);
    },
    onSuccess: () => {
      toast.success("Concatenation started successfully");
    },
    onError: (err) => {
      toast.error(`Failed to start concatenation: ${err.message}`);
    }
  })
  return (
    <ControlsContainer>
      <FormControlLabel control={<Switch checked={showDebugControls} onChange={() => setShowDebugControls(prev => !prev)} />
      } label="Show debug controls" />
      {showDebugControls && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Debug controls
          </Typography>
          <Box className="flex flex-row items-center gap-2">
            <Button variant="contained" color="primary" onClick={() => pollSegmentsMutation.mutate()} disabled={pollSegmentsMutation.isPending || !chosenTask}>
              Poll segments
            </Button>
            <Button variant="contained" color="primary" onClick={() => pollVideosMutation.mutate()} disabled={pollVideosMutation.isPending || !chosenTask}>
              Poll videos
            </Button>
            <Button variant="contained" color="primary" onClick={() => concatenateVideosMutation.mutate()} disabled={concatenateVideosMutation.isPending || !chosenTask}>
              Concatenate videos
            </Button>
          </Box>
        </Box>
      )}
    </ControlsContainer>
  )
}
