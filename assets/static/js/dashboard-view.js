"use strict";
// A classic script in the dashboard's head: it applies the saved grid or list view before the cards paint.
// The key matches VIEW_KEY in dashboard.ts.
{
    let view = null;
    try {
        view = window.localStorage.getItem("ph.dashboard.view");
    }
    catch {
        view = null;
    }
    if (view === "list")
        document.documentElement.dataset["dashView"] = "list";
}
