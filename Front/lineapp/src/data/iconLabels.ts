import type { IconName } from "../assets/Iconlist";

export const iconLabelsTh: Record<IconName, string> = {
    pig: "หมู",
    chicken: "ไก่",
    cow: "วัว",
    duck: "เป็ด",
    goat: "แพะ",
    sheep: "แกะ",
    fish: "ปลา",
    buffalo: "ควาย",
    ox: "โค",
    horse: "ม้า",
    turkey: "ไก่งวง",
    rabbit: "กระต่าย",
    bee: "ผึ้ง",
    corn: "ข้าวโพด",
    rice: "ข้าว",
    carrot: "แครอท",
    potato: "มันฝรั่ง",
    tomato: "มะเขือเทศ",
    eggplant: "มะเขือยาว",
    chili: "พริก",
    cucumber: "แตงกวา",
    lettuce: "ผักกาด",
    onion: "หัวหอม",
    garlic: "กระเทียม",
    banana: "กล้วย",
    mango: "มะม่วง",
    pineapple: "สับปะรด",
    watermelon: "แตงโม",
    coconut: "มะพร้าว",
    grape: "องุ่น",
    apple: "แอปเปิ้ล",
    orange: "ส้ม",
    tractor: "รถแทรกเตอร์",
    barn: "โรงเรือน",
    seedling: "ต้นกล้า",
    plant: "ต้นไม้",
    shovel: "พลั่ว",
    basket: "ตะกร้า",
    fence: "รั้ว",
    sun: "แดด",
    rain: "ฝน",
    cloud: "เมฆ",
    water: "น้ำ",
    fire: "ไฟ",
    money: "เงิน",
    bill: "ใบเสร็จ",
    analytics: "กราฟ",
    bank: "ธนาคาร",
};

export const iconLabelsEn: Record<IconName, string> = {
    pig: "Pig",
    chicken: "Chicken",
    cow: "Cow",
    duck: "Duck",
    goat: "Goat",
    sheep: "Sheep",
    fish: "Fish",
    buffalo: "Buffalo",
    ox: "Ox",
    horse: "Horse",
    turkey: "Turkey",
    rabbit: "Rabbit",
    bee: "Bee",
    corn: "Corn",
    rice: "Rice",
    carrot: "Carrot",
    potato: "Potato",
    tomato: "Tomato",
    eggplant: "Eggplant",
    chili: "Chili",
    cucumber: "Cucumber",
    lettuce: "Lettuce",
    onion: "Onion",
    garlic: "Garlic",
    banana: "Banana",
    mango: "Mango",
    pineapple: "Pineapple",
    watermelon: "Watermelon",
    coconut: "Coconut",
    grape: "Grape",
    apple: "Apple",
    orange: "Orange",
    tractor: "Tractor",
    barn: "Barn",
    seedling: "Seedling",
    plant: "Plant",
    shovel: "Shovel",
    basket: "Basket",
    fence: "Fence",
    sun: "Sun",
    rain: "Rain",
    cloud: "Cloud",
    water: "Water",
    fire: "Fire",
    money: "Money",
    bill: "Bill",
    analytics: "Analytics",
    bank: "Bank",
};

export const iconLabelsJp: Record<IconName, string> = {
    pig: "豚",
    chicken: "鶏",
    cow: "牛",
    duck: "アヒル",
    goat: "ヤギ",
    sheep: "羊",
    fish: "魚",
    buffalo: "水牛",
    ox: "雄牛",
    horse: "馬",
    turkey: "七面鳥",
    rabbit: "うさぎ",
    bee: "蜜蜂",
    corn: "とうもろこし",
    rice: "米",
    carrot: "にんじん",
    potato: "じゃがいも",
    tomato: "トマト",
    eggplant: "なす",
    chili: "唐辛子",
    cucumber: "きゅうり",
    lettuce: "レタス",
    onion: "玉ねぎ",
    garlic: "にんにく",
    banana: "バナナ",
    mango: "マンゴー",
    pineapple: "パイナップル",
    watermelon: "スイカ",
    coconut: "ココナッツ",
    grape: "ぶどう",
    apple: "りんご",
    orange: "オレンジ",
    tractor: "トラクター",
    barn: "納屋",
    seedling: "苗",
    plant: "植物",
    shovel: "シャベル",
    basket: "かご",
    fence: "フェンス",
    sun: "太陽",
    rain: "雨",
    cloud: "雲",
    water: "水",
    fire: "火",
    money: "お金",
    bill: "領収書",
    analytics: "分析",
    bank: "銀行",
};

/** คำค้นเพิ่มเติม (ชื่อทางเลือก/คำย่อ) สำหรับค้นหาข้ามภาษา */
export const iconSearchAliases: Partial<Record<IconName, string[]>> = {
    potato: ["มันสำปะหลัง", "cassava"],
    rice: ["ข้าวเปลือก"],
};

const searchHaystackByIcon = new Map<IconName, string>();

function buildIconSearchHaystack(iconKey: IconName): string {
    const parts = [
        iconKey,
        iconLabelsTh[iconKey],
        iconLabelsEn[iconKey],
        iconLabelsJp[iconKey],
        ...(iconSearchAliases[iconKey] ?? []),
    ];
    return parts.join(" ").toLowerCase();
}

export function iconMatchesSearch(iconKey: IconName, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    let haystack = searchHaystackByIcon.get(iconKey);
    if (!haystack) {
        haystack = buildIconSearchHaystack(iconKey);
        searchHaystackByIcon.set(iconKey, haystack);
    }

    return haystack.includes(normalizedQuery);
}

export function iconLabelForLanguage(iconKey: IconName, lang: string): string {
    if (lang === "en") return iconLabelsEn[iconKey];
    if (lang === "jp") return iconLabelsJp[iconKey];
    return iconLabelsTh[iconKey];
}
