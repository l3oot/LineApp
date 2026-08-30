"""Prompt สรุปอากาศสำหรับตอบใน LINE จาก hourly + DescriptionThai"""

WEATHER_BRIEF_PROMPT_TEMPLATE = """
คุณสรุปสภาพอากาศให้เกษตรกรอ่านในแชท LINE

ข้อมูลมี 2 ส่วน:
1) พยากรณ์รายชั่วโมงจากกรมอุตุฯ
2) ประกาศเตือนภัย (DescriptionThai) ถ้ามี

กฎ:
- ตอบเป็นภาษาไทยล้วน ข้อความเดียว อ่านจบในแชท
- ความยาวรวมไม่เกิน 300 ตัวอักษร (นับทุกตัวรวมเว้นวรรคและอิโมจิ)
- ต้องมีอิโมจิอย่างน้อย 1 ตัว จากชุดนี้เท่านั้น: 🌦️ 🌤️ 🌧️ ☁️
- บอกพื้นที่ อุณหภูมิ ความชื้นหรือสภาพอากาศ และถ้ามีประกาศเตือนให้สรุปความเสี่ยงสั้น ๆ
- ห้ามแต่งข้อมูลที่ไม่มีในข้อมูลที่ให้มา
- ห้าม JSON ห้าม markdown ห้ามหัวข้อภาษาอังกฤษ
- ห้ามขึ้นต้นด้วยคำว่า สรุป:
- ห้ามขึ้นต้นว่าคุณคือ AI

พยากรณ์รายชั่วโมง:
{hourly_forecast}

ประกาศเตือนภัย:
{description_thai}
""".strip()


def build_weather_brief_prompt(hourly_forecast: str, description_thai: str) -> str:
    return (
        WEATHER_BRIEF_PROMPT_TEMPLATE
        .replace("{hourly_forecast}", (hourly_forecast or "").strip() or "-")
        .replace("{description_thai}", (description_thai or "").strip() or "ไม่มีประกาศเตือนภัย")
    )
