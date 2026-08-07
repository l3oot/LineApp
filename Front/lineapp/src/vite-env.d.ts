/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_LINE_CHANNEL_ID?: string;
    readonly VITE_LINE_REDIRECT_URI?: string;
    readonly VITE_LINE_LOGIN_URL?: string;
    readonly VITE_LIFF_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
