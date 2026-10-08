import type { FC } from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { SockPromo } from "./socks/SockPromo";
import { SOCK_DURATION, SOCK_FPS, SOCK_HEIGHT, SOCK_WIDTH } from "./socks/theme";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";
import "./theme";

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="SockPromo"
        component={SockPromo}
        durationInFrames={SOCK_DURATION}
        fps={SOCK_FPS}
        width={SOCK_WIDTH}
        height={SOCK_HEIGHT}
      />
      <Composition
        id="YaiPhaoPromo"
        component={Promo}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
