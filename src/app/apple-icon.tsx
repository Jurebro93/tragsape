import { ImageResponse } from "next/og";
import { PAW_PATH } from "@/components/icons";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikona za početni zaslon mobitela: ista šapa kao u pregledniku, bez zaobljenja (zaobljuje ga sustav). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#FFE7A8",
        }}
      >
        <svg width={128} height={128} viewBox="0 0 64 64">
          <path d={PAW_PATH} fill="#C2451F" />
        </svg>
      </div>
    ),
    size,
  );
}
