import { formatTime } from "@/utils/formatTime";
import { Box, Typography } from "@mui/material";

export default function Ruler({
  durationSec,
  pxPerSecond,
  majorStepSec,
  minorStepSec,
}: {
  durationSec: number;
  pxPerSecond: number;
  majorStepSec: number;
  minorStepSec: number;
}) {
  const ticks: Array<{ x: number; isMajor: boolean; label?: string }> = [];

  const minorCount = Math.floor(durationSec / minorStepSec);
  for (let i = 0; i <= minorCount; i++) {
    const t = i * minorStepSec;
    const x = t * pxPerSecond;
    const isMajor = Math.abs((t / majorStepSec) - Math.round(t / majorStepSec)) < 1e-9;
    ticks.push({
      x,
      isMajor,
      label: isMajor ? formatTime(t) : undefined,
    });
  }

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      {ticks.map((tick, idx) => {
        if (idx === ticks.length - 1) {
          return null; // avoid overflow
        }
        return (<Box
          key={idx}
          sx={{
            position: "absolute",
            left: tick.x,
            top: 0,
            height: "100%",
            width: 0,
            borderLeft: "1px solid",
            borderColor: tick.isMajor ? "text.secondary" : "divider",
          }}
        >
          {tick.label && (
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                top: 2,
                left: 4,
                color: "text.secondary",
                userSelect: "none",
              }}
            >
              {tick.label}
            </Typography>
          )}
        </Box>)
      })}
    </Box>
  );
}
