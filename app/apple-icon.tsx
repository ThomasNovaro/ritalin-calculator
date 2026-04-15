import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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
          background: "#050505", // The dark theme background
        }}
      >
        <div
          style={{
            position: "relative",
            width: "80px",
            height: "140px",
            borderRadius: "40px",
            background: "#FAFAFA",
            border: "12px solid #18181B",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transform: "rotate(45deg)",
          }}
        >
          {/* Top Half Red */}
          <div
            style={{
              width: "100%",
              height: "50%",
              background: "#ef4444",
              borderBottom: "12px solid #18181B",
              boxSizing: "border-box",
            }}
          />
          {/* Bottom Half White */}
          <div
            style={{
              width: "100%",
              height: "50%",
              background: "#FAFAFA",
            }}
          />
          
          {/* Middle Button */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px",
              borderRadius: "24px",
              background: "#FAFAFA",
              border: "12px solid #18181B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "6px",
                background: "#18181B",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
