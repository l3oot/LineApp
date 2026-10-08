import type { FC } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { AiSummary } from "./scenes/AiSummary";
import { Close } from "./scenes/Close";
import { CycleProfit } from "./scenes/CycleProfit";
import { LineChat } from "./scenes/LineChat";
import { Open } from "./scenes/Open";
import { Problem } from "./scenes/Problem";
import { Soundtrack } from "./sfx/Soundtrack";
import { fonts, scenes } from "./theme";

export const Promo: FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: fonts.sarabun, background: "#F7FAF7" }}>
      <Soundtrack />
      <Sequence from={scenes.open.from} durationInFrames={scenes.open.duration}>
        <Open durationInFrames={scenes.open.duration} />
      </Sequence>
      <Sequence from={scenes.problem.from} durationInFrames={scenes.problem.duration}>
        <Problem durationInFrames={scenes.problem.duration} />
      </Sequence>
      <Sequence from={scenes.chat.from} durationInFrames={scenes.chat.duration}>
        <LineChat durationInFrames={scenes.chat.duration} />
      </Sequence>
      <Sequence from={scenes.cycle.from} durationInFrames={scenes.cycle.duration}>
        <CycleProfit durationInFrames={scenes.cycle.duration} />
      </Sequence>
      <Sequence from={scenes.summary.from} durationInFrames={scenes.summary.duration}>
        <AiSummary durationInFrames={scenes.summary.duration} />
      </Sequence>
      <Sequence from={scenes.close.from} durationInFrames={scenes.close.duration}>
        <Close durationInFrames={scenes.close.duration} />
      </Sequence>
    </AbsoluteFill>
  );
};
