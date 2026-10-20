import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { LanguageProvider } from "@/app/providers/LanguageProvider";
import { SettingsProvider } from "@/app/providers/SettingsProvider";
import { CartProvider } from "@/app/providers/CartProvider";
import "@/styles/tokens.css";
import "@/styles/themes.css";
import "@/styles/global.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Élément #root introuvable");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <SettingsProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SettingsProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
