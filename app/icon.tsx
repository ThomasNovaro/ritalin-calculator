import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          color: "#f5f0e8",
          fontFamily: "sans-serif",
          fontSize: "120px",
          fontWeight: "normal",
          letterSpacing: "-0.05em",
        }}
      >
        dose
      </div>
    ),
    { ...size }
  );
}
