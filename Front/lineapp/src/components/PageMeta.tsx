import { useEffect } from "react";
import { applyPageSeo, type PageSeo } from "../lib/seo";

/** Syncs <title> / meta / OG tags for the current view */
export default function PageMeta({ title, description, path, robots, image, jsonLd }: PageSeo) {
    useEffect(() => {
        applyPageSeo({ title, description, path, robots, image, jsonLd });
    }, [title, description, path, robots, image, jsonLd]);

    return null;
}
