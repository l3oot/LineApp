import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import AnalyticCharts from "../components/AnalyticCharts";
import "../styles/analytic.css";
import { auth } from "../lib/auth";
import { categoryApi, transactionApi, type Category, type Transaction } from "../lib/userService";
import { getFriendlyApiErrorMessage } from "../utils/friendlyApiError";
import { useTranslation } from "react-i18next";

export default function Analytic() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth.isAuthed()) {
            setTransactions([]);
            setExpenseCategories([]);
            setIncomeCategories([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        Promise.all([
            transactionApi.list(),
            categoryApi.list("expense"),
            categoryApi.list("income"),
        ])
            .then(([rows, expenseCats, incomeCats]) => {
                if (!cancelled) {
                    setTransactions(rows ?? []);
                    setExpenseCategories(expenseCats ?? []);
                    setIncomeCategories(incomeCats ?? []);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setTransactions([]);
                    setExpenseCategories([]);
                    setIncomeCategories([]);
                    setLoadError(getFriendlyApiErrorMessage(err, t));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    return (
        <MainLayout>
            <div className="home-page">
                <div className="home-content-card">
                    <div className="analytic-page">
                        <AnalyticCharts
                            transactions={transactions}
                            expenseCategories={expenseCategories}
                            incomeCategories={incomeCategories}
                            loading={loading}
                            loadError={loadError}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
