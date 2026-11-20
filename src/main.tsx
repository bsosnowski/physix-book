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
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
