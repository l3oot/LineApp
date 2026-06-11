import { useEffect, useState, type ReactNode } from "react";
import { I18nProvider } from "react-aria-components";
import i18n from "../i18n";
import { ariaLocaleForAppLanguage } from "../utils/formatAppDate";

type AriaI18nProviderProps = {
    children: ReactNode;
};

/** ผูก locale ของ react-aria (ปฏิทิน, DatePicker) กับภาษาที่เลือกในแอป */
export default function AriaI18nProvider({ children }: AriaI18nProviderProps) {
    const [locale, setLocale] = useState(() => ariaLocaleForAppLanguage(i18n.language));

    useEffect(() => {
        const syncLocale = () => setLocale(ariaLocaleForAppLanguage(i18n.language));
        i18n.on("languageChanged", syncLocale);
        return () => {
            i18n.off("languageChanged", syncLocale);
        };
    }, []);

    return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
