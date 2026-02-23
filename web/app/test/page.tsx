"use client";

import { Button, Paper, Typography } from "@mui/material";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Paper className="w-full max-w-lg p-6" elevation={6}>
        <Typography variant="h4" gutterBottom>
          MUI + Tailwind
        </Typography>

        <Typography sx={{ mb: 2 }} color="text.secondary">
          Tailwind for layout, MUI for components.
        </Typography>

        <Button variant="contained">Test Button</Button>
      </Paper>
    </main>
  );
}
