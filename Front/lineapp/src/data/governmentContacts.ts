import {
    FaCalculator,
    FaFileContract,
    FaLandmark,
    FaMapMarkerAlt,
    FaSeedling,
    FaWater,
} from "react-icons/fa";
import type { IconType } from "react-icons";

export type GovContactTone = "green" | "blue" | "teal" | "amber" | "purple" | "pink";

export type GovContact = {
    id: string;
    agency: string;
    parentAgency?: string;
    purpose: string;
    phones?: string[];
    icon: IconType;
    tone: GovContactTone;
};

function telHref(phone: string): string {
    return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

export const governmentContacts: GovContact[] = [
    {
        id: "moac",
        agency: "กระทรวงเกษตรและสหกรณ์",
        phones: ["1170"],
        purpose: "สอบถามข้อมูลด้านการเกษตร, ร้องเรียน, ติดต่อหน่วยงานในสังกัด, ข้อมูลราคาสินค้าเกษตร ฯลฯ",
        icon: FaLandmark,
        tone: "green",
    },
    {
        id: "doae",
        agency: "กรมส่งเสริมการเกษตร",
        phones: ["02-955-1642", "02-955-1640", "02-561-4280"],
        purpose: "ทะเบียนเกษตรกร, ปรับปรุงทะเบียน, ติดตามโครงการช่วยเหลือเกษตรกร",
        icon: FaSeedling,
        tone: "blue",
    },
    {
        id: "rid",
        agency: "กรมชลประทาน",
        phones: ["1460"],
        purpose: "เรื่องน้ำ ชลประทาน แหล่งน้ำ และการติดต่อโครงการชลประทาน",
        icon: FaWater,
        tone: "teal",
    },
    {
        id: "alro",
        agency: "ส.ป.ก.",
        parentAgency: "สำนักงานการปฏิรูปที่ดินเพื่อเกษตรกรรม",
        phones: ["1764"],
        purpose: "เรื่องที่ดิน ส.ป.ก. และคำแนะนำเกี่ยวกับสิทธิ/เอกสาร ส.ป.ก.",
        icon: FaFileContract,
        tone: "amber",
    },
    {
        id: "cad",
        agency: "กรมตรวจบัญชีสหกรณ์",
        phones: ["02-016-8888"],
        purpose: "เรื่องบัญชีสหกรณ์/กลุ่มเกษตรกร และข้อมูลบริการของกรม",
        icon: FaCalculator,
        tone: "purple",
    },
    {
        id: "district-office",
        agency: "สำนักงานเกษตรอำเภอ",
        parentAgency: "กรมส่งเสริมการเกษตร",
        purpose: "ติดต่อเจ้าหน้าที่ในพื้นที่โดยตรง โดยเฉพาะเรื่องทะเบียนเกษตรกรและกิจกรรมการเกษตร",
        icon: FaMapMarkerAlt,
        tone: "pink",
    },
];

export function isHotlineNumber(phone: string): boolean {
    return /^[0-9]{3,4}$/.test(phone.trim());
}

export { telHref };
