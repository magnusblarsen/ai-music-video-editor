import { Box, Typography } from "@mui/material";

export default function InputContainer({ children, label, float = "left" }: { children: React.ReactNode, label?: string, float?: "left" | "right" | "top" }) {
  const isVertical = float === "top";

  return (
    <Box sx={{ display: "flex", flexDirection: isVertical ? "column" : "row", alignItems: isVertical ? "flex-start" : "center" }}>
      {label && (
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      )}
      {children}
    </Box>
  )
}
