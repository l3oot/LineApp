"""รายการ icon ที่ AI เลือกได้ — สอดคล้องกับ Front/lineapp/src/assets/Iconlist.tsx"""

from __future__ import annotations

import json

# key → ชื่อไทย (สำหรับ prompt ให้ LLM จับคู่จาก main)
ICON_LABELS_TH: dict[str, str] = {
    "pig": "หมู",
    "chicken": "ไก่",
    "cow": "วัว",
    "duck": "เป็ด",
    "goat": "แพะ",
    "sheep": "แกะ",
    "fish": "ปลา",
    "buffalo": "ควาย",
    "ox": "โค",
    "horse": "ม้า",
    "turkey": "ไก่งวง",
    "rabbit": "กระต่าย",
    "bee": "ผึ้ง",
    "corn": "ข้าวโพด",
    "rice": "ข้าว",
    "carrot": "แครอท",
    "potato": "มันฝรั่ง",
    "tomato": "มะเขือเทศ",
    "eggplant": "มะเขือยาว",
    "chili": "พริก",
    "cucumber": "แตงกวา",
    "lettuce": "ผักกาด",
    "onion": "หัวหอม",
    "garlic": "กระเทียม",
    "banana": "กล้วย",
    "mango": "มะม่วง",
    "pineapple": "สับปะรด",
    "watermelon": "แตงโม",
    "coconut": "มะพร้าว",
    "grape": "องุ่น",
    "apple": "แอปเปิ้ล",
    "orange": "ส้ม",
    "tractor": "รถแทรกเตอร์",
    "barn": "โรงเรือน",
    "seedling": "ต้นกล้า",
    "plant": "ต้นไม้",
    "shovel": "พลั่ว",
    "basket": "ตะกร้า",
    "fence": "รั้ว",
    "sun": "แดด",
    "rain": "ฝน",
    "cloud": "เมฆ",
    "water": "น้ำ",
    "fire": "ไฟ",
    "money": "เงิน",
    "bill": "ใบเสร็จ",
    "analytics": "กราฟ",
    "bank": "ธนาคาร",
}

ALLOWED_ICONS: frozenset[str] = frozenset(ICON_LABELS_TH.keys())


def icons_for_prompt() -> list[dict[str, str]]:
    return [{"key": key, "th": label} for key, label in ICON_LABELS_TH.items()]


def icons_json_for_prompt() -> str:
    return json.dumps(icons_for_prompt(), ensure_ascii=False)


def normalize_icon(value: str | None) -> str | None:
    if value is None:
        return None
    key = value.strip().lower()
    return key if key in ALLOWED_ICONS else None
