import { Clip } from "@/types/editor"
import { Box, Typography } from "@mui/material"

type Props = {
  width: number;
  height: number;
  clips: Clip[];
  pxPerSecond: number;
}


export default function VideoTrack({ width, height, clips, pxPerSecond }: Props) {
  return (
    <Box sx={{ width: width, height: height }}>
      {clips.map((clip, i) => (
        <Box key={i} sx={{ backgroundColor: "secondary.main", width: clip.duration * pxPerSecond, height: '100%' }} className="border-2 rounded-md" >
          <Box sx={{ width: '100%', height: '80%' }} className="flex items-center justify-center">
            <Box sx={{ position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.3)' }} className="px-2 py-1 rounded-md">
              <Typography variant="body2" color="white">{`Clip ${i + 1}`}</Typography>
            </Box>
            {/* <img src={clip.thumbnail} className="max-w-full max-h-full" />; */}
          </Box>
        </Box>
      ))
      }
    </Box >
  )
}
