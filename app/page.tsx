import { Box, Typography } from "@mui/material";
import VideoPlayer from "./_components/video-player";

export default function Home() {
  return (
    <Box sx={{ height: '100vh' }} className="grid grid-cols-2 grid-rows-2">
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome to the Home Page
        </Typography>
      </Box>
      <VideoPlayer src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome to the Home Page
        </Typography>
      </Box>
      <Box>
        <Typography variant="h4" gutterBottom>
          Welcome to the Home Page
        </Typography>
      </Box>
    </Box>
  )
}
