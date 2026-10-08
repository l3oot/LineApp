"""ถ้าถามอากาศโดยไม่ระบุพื้นที่ ให้ใช้จังหวัด/อำเภอ/ตำบลจาก user_profile"""

from __future__ import annotations

import re
from typing import Any

WEATHER_TOOLS = frozenset({"get_weather_forecast", "get_weather_daily"})

NO_PROFILE_PLACE_REPLY = (
    "ยายยังไม่รู้พื้นที่ของหลานนะจ๊ะ "
    "ตั้งจังหวัดในโปรไฟล์ หรือพิมพ์ชื่อจังหวัดมาได้เลย เช่น สภาพอากาศเชียงใหม่"
)

_LOCATION_KEYS = ("province", "amphoe", "tambon")

# ชื่อจังหวัดทางการ เรียงยาวก่อน เพื่อไม่ให้ชื่อสั้นไปทับชื่อยาว
_PROVINCES: tuple[str, ...] = (
    "กรุงเทพมหานคร",
    "พระนครศรีอยุธยา",
    "ประจวบคีรีขันธ์",
    "นครศรีธรรมราช",
    "อุบลราชธานี",
    "สุราษฎร์ธานี",
    "หนองบัวลำภู",
    "สมุทรปราการ",
    "ปทุมธานี",
    "นนทบุรี",
    "สมุทรสงคราม",
    "สมุทรสาคร",
    "นครราชสีมา",
    "นครสวรรค์",
    "กำแพงเพชร",
    "กาญจนบุรี",
    "สุพรรณบุรี",
    "เพชรบูรณ์",
    "พิษณุโลก",
    "อุตรดิตถ์",
    "แม่ฮ่องสอน",
    "อำนาจเจริญ",
    "ศรีสะเกษ",
    "ฉะเชิงเทรา",
    "ปราจีนบุรี",
    "มหาสารคาม",
    "กาฬสินธุ์",
    "หนองคาย",
    "บึงกาฬ",
    "อุดรธานี",
    "เชียงใหม่",
    "เชียงราย",
    "นครปฐม",
    "นครพนม",
    "มุกดาหาร",
    "สกลนคร",
    "ร้อยเอ็ด",
    "ขอนแก่น",
    "ชัยภูมิ",
    "บุรีรัมย์",
    "สุรินทร์",
    "ยโสธร",
    "อุทัยธานี",
    "สุโขทัย",
    "เพชรบุรี",
    "ราชบุรี",
    "ลพบุรี",
    "สิงห์บุรี",
    "สระบุรี",
    "ชัยนาท",
    "อ่างทอง",
    "ชลบุรี",
    "ระยอง",
    "จันทบุรี",
    "นครนายก",
    "สระแก้ว",
    "ลำปาง",
    "ลำพูน",
    "พะเยา",
    "พิจิตร",
    "ชุมพร",
    "ระนอง",
    "พัทลุง",
    "ปัตตานี",
    "นราธิวาส",
    "สงขลา",
    "ภูเก็ต",
    "พังงา",
    "กระบี่",
    "ตราด",
    "สตูล",
    "ตรัง",
    "ยะลา",
    "แพร่",
    "ตาก",
    "เลย",
    "น่าน",
)

_ALIASES: tuple[tuple[str, str], ...] = (
    ("กรุงเทพ", "กรุงเทพมหานคร"),
    ("กทม", "กรุงเทพมหานคร"),
    ("อยุธยา", "พระนครศรีอยุธยา"),
    ("ประจวบ", "ประจวบคีรีขันธ์"),
    ("สุราษฎร์", "สุราษฎร์ธานี"),
    ("นครศรี", "นครศรีธรรมราช"),
)

_PLACE_CUE = re.compile(
    r"(?:จังหวัด|อำเภอ|ตำบล|แขวง|จ\.|อ\.|ต\.)\s*[\u0E00-\u0E7F]{2,}|เขต[\u0E00-\u0E7F]{2,}"
)


def prepare_weather_arguments(
    arguments: dict[str, Any] | None,
    user_message: str,
    profile: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """ถ้าระบุพื้นที่ในข้อความล่าสุด ใช้พื้นที่นั้น

    ถ้าไม่ระบุ คืน args ที่ใส่จังหวัด/อำเภอ/ตำบลจากโปรไฟล์
    คืน None เมื่อไม่ระบุพื้นที่และโปรไฟล์ก็ไม่มีจังหวัด
    """
    args = dict(arguments or {})
    text = user_message or ""
    named = province_named_in_text(text)
    if named or _has_place_cue(text) or _args_mentioned(args, text):
        if named:
            args["province"] = named
            for key in ("amphoe", "tambon"):
                value = str(args.get(key) or "").strip()
                if value and value not in text:
                    args.pop(key, None)
        return args

    location = location_from_profile(profile)
    if location is None:
        return None
    for key in _LOCATION_KEYS:
        args.pop(key, None)
    args.update(location)
    return args


def province_named_in_text(text: str) -> str | None:
    raw = text or ""
    for name in sorted(_PROVINCES, key=len, reverse=True):
        if _mentioned(raw, name):
            return name
    for alias, official in _ALIASES:
        if _mentioned(raw, alias):
            return official
    return None


def location_from_profile(profile: dict[str, Any] | None) -> dict[str, str] | None:
    if not isinstance(profile, dict):
        return None
    province = str(profile.get("province") or "").strip()
    if not province:
        return None
    out = {"province": province}
    district = str(profile.get("district") or "").strip()
    sub_district = str(profile.get("subDistrict") or "").strip()
    if district:
        out["amphoe"] = district
    if sub_district:
        out["tambon"] = sub_district
    return out


def _has_place_cue(text: str) -> bool:
    return _PLACE_CUE.search(text or "") is not None


def _args_mentioned(arguments: dict[str, Any], text: str) -> bool:
    for key in _LOCATION_KEYS:
        value = str(arguments.get(key) or "").strip()
        if len(value) >= 2 and value in text:
            return True
    return False


def _mentioned(text: str, name: str) -> bool:
    if len(name) >= 4:
        return name in text
    return re.search(
        rf"(?:^|\s|จังหวัด|จ\.|อากาศ){re.escape(name)}(?![\u0E00-\u0E7F])",
        text,
    ) is not None
