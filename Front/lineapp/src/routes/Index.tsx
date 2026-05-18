import { Outlet, createBrowserRouter } from "react-router-dom";
import Sum from "../pages/Sum";
import Cycle from "../pages/Cycle";
import Analytic from "../pages/Analytic";
import List from "../pages/List";
import Setting from "../pages/Setting";
import LineCallback from "../pages/LineCallback";
import RequireAuth from "../components/RequireAuth";

export const router = createBrowserRouter([
    // /callback ต้อง public — เป็น endpoint รับ code จาก LINE
    {
        path: "/callback",
        element: <LineCallback />,
    },
    // ทุก route ที่เหลือ → ต้อง login (auto-redirect ไป LINE ถ้ายังไม่ login)
    {
        element: (
            <RequireAuth>
                <Outlet />
            </RequireAuth>
        ),
        children: [
            { path: "/", element: <Sum /> },
            { path: "/cycle", element: <Cycle /> },
            { path: "/analytics", element: <Analytic /> },
            { path: "/list", element: <List /> },
            { path: "/settings", element: <Setting /> },
        ],
    },
]);
