import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import AriaI18nProvider from "./components/AriaI18nProvider";
import { router } from "./routes/Index";
import "../src/styles/index.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AriaI18nProvider>
      <RouterProvider router={router} />
    </AriaI18nProvider>
  </React.StrictMode>
);