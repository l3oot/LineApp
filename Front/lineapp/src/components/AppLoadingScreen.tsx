import loadMark from "../assets/load.png";
import "../styles/app-loading.css";

type AppLoadingScreenProps = {
    label?: string;
    variant?: "page" | "inline";
};

export default function AppLoadingScreen({ label = "กำลังโหลด", variant = "page" }: AppLoadingScreenProps) {
    return (
        <div
            className={`app-loading-screen${variant === "inline" ? " app-loading-screen--inline" : ""}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={label}
        >
            <img className="app-loading-mark" src={loadMark} alt="" />
        </div>
    );
}
