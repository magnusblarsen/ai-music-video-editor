"use client"

import { Paper } from '@mui/material'

export default function ControlsContainer({ children }: { children: React.ReactNode }) {
  return (
    <Paper variant="outlined" className="flex flex-col items-start p-4 gap-2 mb-4">
      {children}
    </Paper>
  )
}
