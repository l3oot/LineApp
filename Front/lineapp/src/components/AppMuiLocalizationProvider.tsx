import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AdapterDayjsBuddhist } from "@mui/x-date-pickers/AdapterDayjsBuddhist";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    dayjsLocaleForAppLanguage,
    muiPickerLocaleText,
    usesBuddhistEra,
} from "../utils/formatAppDate";

import "dayjs/locale/en";
import "dayjs/locale/ja";
import "dayjs/locale/th";

dayjs.extend(buddhistEra);

type AppMuiLocalizationProviderProps = {
    children: ReactNode;
};

export default function AppMuiLocalizationProvider({ children }: AppMuiLocalizationProviderProps) {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    return (
        <LocalizationProvider
            key={lang}
            dateAdapter={usesBuddhistEra(lang) ? AdapterDayjsBuddhist : AdapterDayjs}
            adapterLocale={dayjsLocaleForAppLanguage(lang)}
            localeText={muiPickerLocaleText(lang)}
        >
            {children}
        </LocalizationProvider>
    );
}
