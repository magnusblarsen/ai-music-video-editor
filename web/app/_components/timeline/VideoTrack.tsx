import { Clip } from "@/types/editor"
import { Box } from "@mui/material"
import VideoClip from "./VideoClip";

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
        <VideoClip key={i} index={i} clip={clip} pxPerSecond={pxPerSecond} />
      ))
      }
    </Box >
  )
}
