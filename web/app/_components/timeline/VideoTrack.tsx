import { Clip } from "@/types/editor"
import { Box, Typography } from "@mui/material"

type Props = {
  width: number;
  height: number;
  clips: Clip[];
  pxPerSecond: number;
}


export default function VideoTrack({ width, height, clips, pxPerSecond }: Props) {
  console.log("clips:", clips);

  return (
    <Box sx={{ width: width, height: height, position: 'relative' }}>
      {clips.map((clip, i) => (
        <Box
          key={i}
          sx={{ position: 'absolute', backgroundColor: "secondary.main", width: clip.duration_seconds * pxPerSecond, height: '100%', left: clip.start_seconds * pxPerSecond }}
          className="border rounded-sm"
        >
          <Box sx={{ width: '100%', height: '80%' }} className="flex items-center justify-center">
            {(clip.duration_seconds * pxPerSecond) > 100 && (
              <Box sx={{ position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.3)' }} className="rounded-sm">
                <Typography variant="body2" color="white">{`Clip ${i + 1}`}</Typography>
                {/* <img src={clip.thumbnail} className="max-w-full max-h-full" />; */}
              </Box>
            )}
          </Box>
        </Box>
      ))
      }
    </Box >
  )
}
