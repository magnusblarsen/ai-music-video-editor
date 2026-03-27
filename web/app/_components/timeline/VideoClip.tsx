import { Clip } from "@/types";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";


type Props = {
  pxPerSecond: number;
  clip: Clip;
  index: number;
}

type ScenePayload = {
  aesthetics: string;
  cameraMovement: string;
  scriptDescription: string;
};

export default function VideoClip({ pxPerSecond, clip, index }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);


  const initialSceneData: ScenePayload = useMemo(() => ({
    aesthetics: clip.aesthetics ?? "",
    cameraMovement: clip.camera_movement ?? "",
    scriptDescription: clip.script_description ?? "",
  }), [clip.aesthetics, clip.camera_movement, clip.script_description]);

  const [sceneData, setSceneData] = useState<ScenePayload>(initialSceneData)

  useEffect(() => {
    setSceneData(initialSceneData);
  }, [initialSceneData])

  const changed =
    sceneData.aesthetics !== initialSceneData.aesthetics ||
    sceneData.cameraMovement !== initialSceneData.cameraMovement ||
    sceneData.scriptDescription !== initialSceneData.scriptDescription;


  const handleChange = (field: keyof ScenePayload) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSceneData((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };


  const handleClickOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(true)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (changed) {
      setConfirmCloseOpen(true)
      return;
    }
    setOpen(false)
  }

  const confirmClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmCloseOpen(false);
    setOpen(false);
  };

  const cancelClose = () => {
    setConfirmCloseOpen(false);
  };


  const generateSceneMutation = useMutation({
    mutationFn: () => {
      return axios.post(`/api/clips/${clip.id}/regenerate`, sceneData);
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("Scene generation started");
    }
  })


  return (
    <Box
      sx={{ position: 'absolute', backgroundColor: "secondary.main", width: clip.duration_seconds * pxPerSecond, height: '100%', left: clip.start_seconds * pxPerSecond, cursor: 'pointer' }}
      className="border rounded-sm"
      onClick={handleClickOpen}
    >
      {(clip.duration_seconds * pxPerSecond) > 60 && (
        <Box sx={{ width: '100%', height: '80%' }} className="flex items-center justify-center">
          <Box sx={{ position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.3)' }} className="rounded-sm">
            <Typography variant="body2" color="white">{`Clip ${index + 1}`}</Typography>
          </Box>
        </Box>
      )}
      <Dialog onClose={handleClose} open={open} fullWidth>
        <Box>
          <DialogTitle>
            Change scene
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="h4" gutterBottom>
              {`Clip ${index + 1}`}
            </Typography>
            <Typography variant="h5" gutterBottom>
              Aesthetics
            </Typography>
            <TextField
              label="Aesthetics"
              multiline
              fullWidth
              value={sceneData.aesthetics}
              onChange={handleChange("aesthetics")}
            />
            <Typography variant="h5" gutterBottom>
              Camera movement
            </Typography>
            <TextField
              label="Camera movement"
              multiline
              fullWidth
              value={sceneData.cameraMovement}
              onChange={handleChange("cameraMovement")}
            />
            <Typography variant="h5" gutterBottom>
              Script description
            </Typography>
            <TextField
              label="Script description"
              multiline
              fullWidth
              value={sceneData.scriptDescription}
              onChange={handleChange("scriptDescription")}
            />
          </DialogContent>
        </Box>
        <Button variant="contained" disabled={!changed} className="m-2" onClick={() => generateSceneMutation.mutate()}>Generate scene</Button>
      </Dialog>
      <Dialog open={confirmCloseOpen} onClose={cancelClose}>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to close? Your unsaved changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClose}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmClose}>
            Close anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
