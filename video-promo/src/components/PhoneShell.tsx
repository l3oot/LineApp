import type { FC, ReactNode } from "react";
import { color } from "../theme";

export const PhoneShell: FC<{
  width?: number;
  height?: number;
  children: ReactNode;
  bar?: ReactNode;
}> = ({ width = 390, height = 760, children, bar }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 42,
        padding: 10,
        background: "#1A2E24",
        boxShadow: "0 28px 64px rgba(31, 107, 66, 0.22)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 32,
          overflow: "hidden",
          background: color.washed,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {bar}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};
