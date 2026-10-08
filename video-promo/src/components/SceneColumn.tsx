import type { CSSProperties, FC, ReactNode } from "react";

export const SceneColumn: FC<{
  copy: ReactNode;
  proof?: ReactNode;
  copyStyle?: CSSProperties;
}> = ({ copy, proof, copyStyle }) => {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "96px 56px 80px",
        gap: 32,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          width: "100%",
          ...copyStyle,
        }}
      >
        {copy}
      </div>
      {proof ? (
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {proof}
        </div>
      ) : null}
    </div>
  );
};
