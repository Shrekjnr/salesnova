// =====================================================
// GLOBAL THEME SYSTEM
// =====================================================

function applyPredictionTheme() {

    const savedTheme =
        localStorage.getItem("settingsTheme") || "dark";

    document.documentElement.setAttribute(
        "data-theme",
        savedTheme
    );

    document.body.classList.remove(
        "light-mode",
        "dark-mode"
    );

    document.body.classList.add(
        savedTheme === "light"
            ? "light-mode"
            : "dark-mode"
    );
}


// Apply theme immediately
applyPredictionTheme();


// Keep theme synchronized if changed elsewhere
window.addEventListener("storage", function (event) {

    if (event.key === "settingsTheme") {

        applyPredictionTheme();

    }

});

// ======================================================
// API BASE URL
// ======================================================

const API = "";


// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {

    try {

        const response = await fetch(
            `${API}/profile`,
            {
                credentials: "include"
            }
        );

        if (!response.ok) {

            window.location.href = "login.html";
            return;

        }

        const user = await response.json();

        console.log("Logged-in user:", user);


        // ==================================================
        // BUSINESS NAME
        // ==================================================

        const businessName =
            document.getElementById("businessName");

        if (businessName) {

            businessName.textContent =
                " " + (user.business || "Business");

        }


        // ==================================================
        // OWNER NAME
        // ==================================================

        const ownerName =
            document.getElementById("sidebarProfileName");

        if (ownerName) {

            ownerName.textContent =
                user.fullname || "Administrator";

        }


        // ==================================================
        // PROFILE IMAGE
        // ==================================================

        const profileImage =
            document.getElementById("sidebarProfileImage");

        if (
            profileImage &&
            user.profile_picture
        ) {

            profileImage.src =
                `${API}/uploads/${user.profile_picture}`;

        }

    }

    catch (error) {

        console.error(
            "User loading error:",
            error
        );

    }

}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

    try {

        await fetch(
            `${API}/logout`,
            {
                credentials: "include"
            }
        );

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

    window.location.href = "login.html";

}


// ======================================================
// LOAD PREDICTION SUMMARY
// ======================================================

async function loadSummary() {

    try {

        const response = await fetch(
            `${API}/prediction_summary`,
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Prediction summary server response:",
                errorText
            );

            throw new Error(
                "Prediction summary request failed"
            );

        }


        const data =
            await response.json();


        console.log(
            "Prediction Summary:",
            data
        );


        // ==================================================
        // TOMORROW
        // ==================================================

        const tomorrow =
            document.getElementById(
                "tomorrowSales"
            );

        if (tomorrow) {

            tomorrow.textContent =
                "₦" +
                Number(
                    data.tomorrow_sales || 0
                ).toLocaleString();

        }


        // ==================================================
        // WEEK
        // ==================================================

        const weekly =
            document.getElementById(
                "weeklySales"
            );

        if (weekly) {

            weekly.textContent =
                "₦" +
                Number(
                    data.week_sales || 0
                ).toLocaleString();

        }


        // ==================================================
        // MONTH
        // ==================================================

        const monthly =
            document.getElementById(
                "monthlySales"
            );

        if (monthly) {

            monthly.textContent =
                "₦" +
                Number(
                    data.month_sales || 0
                ).toLocaleString();

        }


        // ==================================================
        // HEALTH SCORE
        // ==================================================

        const score =
            Number(
                data.health ?? 0
            );


        const healthScore =
            document.getElementById(
                "healthScore"
            );

        if (healthScore) {

            healthScore.textContent =
                score + "%";

        }


        // ==================================================
        // HEALTH CIRCLE SCORE
        // ==================================================

        const healthCircleScore =
            document.getElementById(
                "healthCircleScore"
            );

        if (healthCircleScore) {

            healthCircleScore.textContent =
                score + "%";

        }


        // ==================================================
        // HEALTH CIRCLE
        // ==================================================

        const circle =
            document.getElementById(
                "healthCircle"
            );

        if (circle) {

            circle.style.background =
                `conic-gradient(
                    #22c55e ${score}%,
                    #e5e7eb ${score}% 100%
                )`;

        }


        // ==================================================
        // HEALTH STATUS
        // ==================================================

        const healthStatus =
            document.getElementById(
                "healthStatus"
            );

        if (healthStatus) {

            if (score >= 80) {

                healthStatus.textContent =
                    "Excellent";

            }

            else if (score >= 50) {

                healthStatus.textContent =
                    "Good";

            }

            else {

                healthStatus.textContent =
                    "Needs Attention";

            }

        }

    }

    catch (error) {

        console.error(
            "Prediction summary error:",
            error
        );

    }

}


// ======================================================
// LOAD INVENTORY TABLE
// ======================================================

async function loadPredictionTable() {

    try {

        const response = await fetch(
            `${API}/prediction_products`,
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Prediction products response:",
                errorText
            );

            throw new Error(
                "Unable to load prediction products"
            );

        }


        const products =
            await response.json();


        console.log(
            "Prediction Products:",
            products
        );


        const table =
            document.querySelector(
                "#inventoryTable tbody"
            );


        if (!table) {

            console.error(
                "Inventory table body not found."
            );

            return;

        }


        table.innerHTML = "";


        // ==================================================
        // NO PRODUCTS
        // ==================================================

        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            table.innerHTML = `
                <tr>
                    <td colspan="4">
                        No inventory data available.
                    </td>
                </tr>
            `;

            return;

        }


        // ==================================================
        // DISPLAY PRODUCTS
        // ==================================================

        products.forEach(product => {

            let advice;


            if (
                product.status ===
                "Out of Stock"
            ) {

                advice =
                    "Restock immediately";

            }

            else if (
                product.status ===
                "Low Stock"
            ) {

                advice =
                    "Prepare restock";

            }

            else if (
                product.status ===
                "Dead Stock"
            ) {

                advice =
                    "Consider promotion";

            }

            else if (
                product.status ===
                "Unsold (7+ Days)"
            ) {

                advice =
                    "Consider promotion";

            }

            else {

                advice =
                    "Stock level healthy";

            }


            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>
                    ${product.product_name || "-"}
                </td>

                <td>
                    ${product.status || "-"}
                </td>

                <td>
                    ${product.days_in_store ?? 0}
                    days
                </td>

                <td>
                    ${advice}
                </td>
            `;


            table.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Prediction table error:",
            error
        );

    }

}


// ======================================================
// SALES FORECAST CHART
// ======================================================

let salesChart = null;


async function loadSalesChart() {

    try {

        const response = await fetch(
            `${API}/sales_chart_data`,
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Sales chart server response:",
                errorText
            );

            throw new Error(
                "Unable to load chart data"
            );

        }


        const chartData =
            await response.json();


        console.log(
            "Chart Data:",
            chartData
        );


        const canvas =
            document.getElementById(
                "predictionChart"
            );


        if (!canvas) {

            console.error(
                "Prediction chart canvas not found."
            );

            return;

        }


        // ==================================================
        // CHECK CHART.JS
        // ==================================================

        if (typeof Chart === "undefined") {

            console.error(
                "Chart.js is not loaded."
            );

            return;

        }


        const ctx =
            canvas.getContext("2d");


        // ==================================================
        // DESTROY OLD CHART
        // ==================================================

        if (salesChart) {

            salesChart.destroy();

        }


        // ==================================================
        // CREATE CHART
        // ==================================================

        salesChart =
            new Chart(
                ctx,
                {

                    type: "line",

                    data: {

                        labels:
                            chartData.labels || [],

                        datasets: [

                            {

                                label:
                                    "Sales Forecast",

                                data:
                                    chartData.values || [],

                                borderWidth: 3,

                                tension: 0.4,

                                fill: false,

                                pointRadius: 4

                            }

                        ]

                    },


                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {

                                display: true

                            }

                        },


                        scales: {

                            y: {

                                beginAtZero: true

                            }

                        }

                    }

                }
            );

    }

    catch (error) {

        console.error(
            "Sales chart error:",
            error
        );

    }

}


// ======================================================
// LOAD RECOMMENDATIONS
// ======================================================

async function loadRecommendations() {

    try {

        const response = await fetch(
            `${API}/prediction_summary`,
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Unable to load recommendations"
            );

        }


        const data =
            await response.json();


        console.log(
            "Recommendations:",
            data.recommendations
        );


        const box =
            document.getElementById(
                "recommendations"
            );


        if (!box) {

            return;

        }


        box.innerHTML = "";


        const recommendations =
            Array.isArray(
                data.recommendations
            )
                ? data.recommendations
                : [];


        // ==================================================
        // NO RECOMMENDATIONS
        // ==================================================

        if (
            recommendations.length === 0
        ) {

            box.innerHTML = `
                <p>
                    💡 Business performance looks healthy.
                </p>
            `;

            return;

        }


        // ==================================================
        // DISPLAY RECOMMENDATIONS
        // ==================================================

        recommendations.forEach(
            item => {

                const paragraph =
                    document.createElement("p");

                paragraph.textContent =
                    "💡 " + item;

                box.appendChild(
                    paragraph
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Recommendations error:",
            error
        );

    }

}


// ======================================================
// START APPLICATION
// ======================================================

window.addEventListener(
    "load",
    async function () {

        console.log(
            "SalesNova Prediction page loaded."
        );


        // Load user first

        await loadUser();


        // Load all prediction components

        await Promise.all([
            loadSummary(),
            loadPredictionTable(),
            loadSalesChart(),
            loadRecommendations()
        ]);


        console.log(
            "Prediction page finished loading."
        );

    }
);