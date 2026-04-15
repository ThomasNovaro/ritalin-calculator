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
          background: "transparent",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "300px",
            height: "460px",
            borderRadius: "150px",
            background: "#FAFAFA",
            border: "40px solid #18181B",
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
              borderBottom: "40px solid #18181B",
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
              width: "140px",
              height: "140px",
              borderRadius: "70px",
              background: "#FAFAFA",
              border: "40px solid #18181B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "20px",
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
