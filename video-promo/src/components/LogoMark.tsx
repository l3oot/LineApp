import { Img, staticFile } from "remotion";

export const LogoMark: React.FC<{ size?: number }> = ({ size = 96 }) => {
  return (
    <Img
      src={staticFile("yaiphao.png")}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        objectFit: "cover",
        background: "#fff",
        boxShadow: "0 8px 22px rgba(31, 107, 66, 0.16)",
      }}
    />
  );
};
