import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PhoneShell } from "../components/PhoneShell";
import { Stage } from "../components/Stage";
import { rise, sceneOpacity } from "../motion";
import { color, fonts } from "../theme";

type Tool = {
  title: string;
  blurb: string;
  screen: ReactNode;
};

const TOOLS: Tool[] = [
  {
    title: "รายการรับ-จ่าย",
    blurb: "ดูแยกวัน กรองประเภท และส่งออก Excel / PDF",
    screen: <ListScreen />,
  },
  {
    title: "วิเคราะห์",
    blurb: "กราฟแนวโน้มรายรับ-รายจ่ายตามช่วงเวลา",
    screen: <AnalyticScreen />,
  },
  {
    title: "ราคาสินค้าเกษตร",
    blurb: "ค้นหาและเทียบราคารายวันก่อนขาย",
    screen: <PricesScreen />,
  },
  {
    title: "พยากรณ์อากาศ",
    blurb: "สภาพอากาศตามพื้นที่ในโปรไฟล์",
    screen: <WeatherScreen />,
  },
  {
    title: "ติดต่อหน่วยงาน",
    blurb: "เบอร์สายด่วนและภาครัฐรวมไว้ที่เดียว",
    screen: <GovScreen />,
  },
];

export const Toolkit: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = rise(frame, fps, 4, 20);
  const dwell = Math.floor((durationInFrames - 36) / TOOLS.length);
  const index = Math.min(TOOLS.length - 1, Math.max(0, Math.floor((frame - 18) / dwell)));
  const local = (frame - 18) % dwell;
  const slide = interpolate(local, [0, 14], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, 12, dwell - 12, dwell], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const active = TOOLS[index];

  return (
    <Stage>
      <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames) }}>
        <div
          style={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 430px",
            gap: 56,
            alignItems: "center",
            padding: "0 120px",
          }}
        >
          <div style={copy}>
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.mali,
                fontWeight: 700,
                fontSize: 58,
                lineHeight: 1.18,
                letterSpacing: "-0.02em",
                color: color.ink,
              }}
            >
              ทุกอย่างที่ยายเภาทำได้
            </h2>
            <p
              style={{
                margin: "18px 0 28px",
                fontSize: 28,
                lineHeight: 1.45,
                color: color.inkSoft,
              }}
            >
              เปิดเว็บดูสรุป ราคา และอากาศประกอบการตัดสินใจ
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {TOOLS.map((tool, i) => {
                const on = i === index;
                return (
                  <div
                    key={tool.title}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 18,
                      background: on ? color.surface : "transparent",
                      boxShadow: on ? "0 10px 28px rgba(59,178,115,0.12)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 22,
                        color: on ? color.leafDeep : color.ink,
                        fontWeight: 800,
                      }}
                    >
                      {tool.title}
                    </strong>
                    <span style={{ fontSize: 18, color: color.inkSoft }}>{tool.blurb}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              opacity,
              transform: `translateY(${slide}px)`,
            }}
          >
            <PhoneShell width={400} height={760} bar={<AppBar title={active.title} />}>
              {active.screen}
            </PhoneShell>
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

function AppBar({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: "16px 18px 10px",
        background: color.washed,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: color.charcoal }}>{title}</h3>
    </div>
  );
}

function ListScreen() {
  return (
    <div style={{ padding: "8px 16px 16px", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["ทั้งหมด", "รายรับ", "รายจ่าย"].map((chip, i) => (
          <span
            key={chip}
            style={{
              padding: "7px 14px",
              borderRadius: 99,
              background: i === 0 ? color.youngRice : color.surfaceSoft,
              color: i === 0 ? "#fff" : color.moss,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {chip}
          </span>
        ))}
      </div>
      <div
        style={{
          background: color.surface,
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 10px 28px rgba(59,178,115,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: color.youngRiceSoft,
          }}
        >
          <span style={{ fontWeight: 700, color: color.charcoal }}>26 ก.ย. 2569</span>
          <span style={{ fontWeight: 800, color: color.canopy }}>+12,300</span>
        </div>
        <Row icon="ขาย" title="ขายข้าวโพด" sub="ขายผลผลิต" amount="+18,500" income />
        <Row icon="ปุ๋ย" title="ซื้อปุ๋ย" sub="ค่าปุ๋ย" amount="-5,000" />
        <Row icon="น้ำมัน" title="ค่าน้ำมัน" sub="ค่าขนส่ง" amount="-1,200" last />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["Excel", "PDF"].map((label) => (
          <span
            key={label}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 99,
              background: color.surface,
              border: `1px solid ${color.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: color.leafDeep,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  sub,
  amount,
  income,
  last,
}: {
  icon: string;
  title: string;
  sub: string;
  amount: string;
  income?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "none" : `1px solid ${color.border}`,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 99,
          background: income ? color.youngRiceSoft : "#FFF5F5",
          color: income ? color.canopy : color.chili,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, color: color.charcoal, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 13, color: color.moss }}>{sub}</div>
      </div>
      <div style={{ fontWeight: 800, color: income ? color.canopy : color.chili }}>{amount}</div>
    </div>
  );
}

function AnalyticScreen() {
  const income = [42, 58, 50, 72, 64, 80];
  const expense = [30, 40, 36, 48, 44, 52];
  const toPts = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = 16 + (i * 200) / (vals.length - 1);
        const y = 118 - v;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          background: color.surface,
          borderRadius: 22,
          padding: 16,
          boxShadow: "0 10px 28px rgba(59,178,115,0.10)",
        }}
      >
        <h4 style={{ margin: "0 0 12px", fontSize: 18, color: color.charcoal }}>
          แนวโน้มรายรับ-รายจ่าย
        </h4>
        <svg viewBox="0 0 232 140" width="100%" height="168">
          {[30, 60, 90].map((y) => (
            <line key={y} x1="12" x2="220" y1={y} y2={y} stroke={color.border} strokeWidth="1" />
          ))}
          <polyline points={toPts(expense)} fill="none" stroke={color.chiliAction} strokeWidth="3" />
          <polyline points={toPts(income)} fill="none" stroke={color.youngRice} strokeWidth="3" />
        </svg>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {["1M", "6M", "1Y", "ALL"].map((chip, i) => (
            <span
              key={chip}
              style={{
                padding: "6px 12px",
                borderRadius: 99,
                background: i === 1 ? color.youngRice : color.surfaceSoft,
                color: i === 1 ? "#fff" : color.moss,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PricesScreen() {
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div
        style={{
          background: color.surface,
          borderRadius: 22,
          padding: 16,
          boxShadow: "0 10px 28px rgba(59,178,115,0.10)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: color.moss }}>ค้นหาสินค้า</div>
        <div
          style={{
            marginTop: 8,
            height: 44,
            borderRadius: 16,
            background: color.surfaceSoft,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            fontWeight: 700,
            color: color.charcoal,
          }}
        >
          ข้าวโพดเลี้ยงสัตว์
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          ["ล่าสุด", "8.95"],
          ["ต่ำสุด", "8.40"],
          ["สูงสุด", "9.20"],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: color.surface,
              borderRadius: 18,
              padding: "14px 10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: color.moss }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: color.charcoal }}>{value}</div>
            <div style={{ fontSize: 11, color: color.moss }}>บาท/กก.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherScreen() {
  return (
    <div>
      <div
        style={{
          margin: 16,
          borderRadius: 22,
          background: "linear-gradient(180deg, #7EB8E8 0%, #C5E4F7 100%)",
          padding: "22px 18px",
          color: "#12324A",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>อำเภอเมือง · ขอนแก่น</div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 8 }}>32°</div>
        <div style={{ fontWeight: 600 }}>มีเมฆบางส่วน · ความชื้น 58%</div>
      </div>
      <div
        style={{
          margin: "0 16px",
          background: color.surface,
          borderRadius: 22,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {[
          ["จ.", "33°"],
          ["อ.", "32°"],
          ["พ.", "30°"],
          ["พฤ.", "29°"],
          ["ศ.", "31°"],
        ].map(([d, t]) => (
          <div key={d} style={{ textAlign: "center" }}>
            <div style={{ color: color.moss, fontWeight: 700 }}>{d}</div>
            <div style={{ fontWeight: 800, color: color.charcoal, marginTop: 6 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GovScreen() {
  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <GovCard agency="สายด่วนเกษตร" parent="กระทรวงเกษตรและสหกรณ์" phone="1170" />
      <GovCard agency="กรมส่งเสริมการเกษตร" parent="ติดต่อเจ้าหน้าที่อำเภอ" phone="02-579-0151" />
    </div>
  );
}

function GovCard({ agency, parent, phone }: { agency: string; parent: string; phone: string }) {
  return (
    <div
      style={{
        background: color.surface,
        borderRadius: 22,
        padding: 16,
        boxShadow: "0 10px 28px rgba(59,178,115,0.10)",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, color: color.charcoal }}>{agency}</div>
      <div style={{ fontSize: 14, color: color.moss, marginTop: 4 }}>{parent}</div>
      <div
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          height: 36,
          padding: "0 14px",
          borderRadius: 99,
          background: color.youngRiceSoft,
          color: color.leafDeep,
          fontWeight: 800,
        }}
      >
        {phone}
      </div>
    </div>
  );
}
