"""ถามอากาศโดยไม่ระบุที่ ต้องใช้พื้นที่จาก user_profile"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from src.orchestrator.weather_location import (
    prepare_weather_arguments,
    province_named_in_text,
)

_PROFILE = {
    "province": "บุรีรัมย์",
    "district": "นางรอง",
    "subDistrict": "นางรอง",
}


class WeatherLocationTests(unittest.TestCase):
    def test_unspecified_uses_profile(self) -> None:
        args = prepare_weather_arguments(
            {"province": "เชียงใหม่", "date": "2026-10-08"},
            "สภาพอากาศวันนี้",
            _PROFILE,
        )
        self.assertEqual(
            args,
            {
                "date": "2026-10-08",
                "province": "บุรีรัมย์",
                "amphoe": "นางรอง",
                "tambon": "นางรอง",
            },
        )

    def test_named_province_overrides_guess_and_profile(self) -> None:
        args = prepare_weather_arguments(
            {"province": "บุรีรัมย์", "amphoe": "เมือง"},
            "อากาศเชียงใหม่พรุ่งนี้",
            _PROFILE,
        )
        self.assertEqual(args, {"province": "เชียงใหม่"})

    def test_keeps_district_when_user_named_it(self) -> None:
        args = prepare_weather_arguments(
            {"province": "นครราชสีมา", "amphoe": "ปากช่อง"},
            "อากาศอำเภอปากช่อง",
            _PROFILE,
        )
        self.assertEqual(args["amphoe"], "ปากช่อง")
        self.assertEqual(args["province"], "นครราชสีมา")

    def test_alias_ayutthaya(self) -> None:
        self.assertEqual(province_named_in_text("อากาศอยุธยา"), "พระนครศรีอยุธยา")

    def test_short_province_needs_a_boundary(self) -> None:
        self.assertIsNone(province_named_in_text("อากาศตากฝน"))
        self.assertEqual(province_named_in_text("อากาศตาก"), "ตาก")

    def test_missing_profile_returns_none(self) -> None:
        self.assertIsNone(
            prepare_weather_arguments({}, "ฝนจะตกไหม", {"province": "  "})
        )

    def test_province_list_matches_admin_json(self) -> None:
        path = (
            Path(__file__).resolve().parents[2]
            / "user-service"
            / "demo"
            / "src"
            / "main"
            / "resources"
            / "thai-admin"
            / "provinces.json"
        )
        rows = json.loads(path.read_text(encoding="utf-8"))
        official = {row["provinceNameTh"] for row in rows}
        from src.orchestrator.weather_location import _PROVINCES

        self.assertEqual(set(_PROVINCES), official)


if __name__ == "__main__":
    unittest.main()
