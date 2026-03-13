"use client"

import { Box } from '@mui/material'

export default function ControlsContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box className="flex flex-col items-start border-2 p-4 gap-2 rounded border-gray-300">
      {children}
    </Box>
  )
}
