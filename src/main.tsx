import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import "./i18n";
import { detectLocale } from "./i18n/config";
import { AppShell } from "./app/AppShell";
import { LocaleLayout } from "./app/LocaleLayout";
import { HomePage } from "./app/HomePage";
import { ReaderPage } from "./app/ReaderPage";
import "./styles/index.css";

// Must match Vite's `base` ("/physix-book/" on GitHub Pages, "/" locally).
// createBrowserRouter wants the basename without a trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter([
  { path: "/", element: <Navigate to={`/${detectLocale()}/`} replace /> },
  {
    path: "/:locale",
    element: <LocaleLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "chapter/:slug", element: <ReaderPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
], { basename });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
