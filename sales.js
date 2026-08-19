// ======================================================
// SALES.JS
// ======================================================


// ======================================================
// ELEMENTS
// ======================================================

const product =
    document.getElementById("product");

const quantity =
    document.getElementById("quantity");

const price =
    document.getElementById("price");

const total =
    document.getElementById("total");

const availableStock =
    document.getElementById("availableStock");

const salesBody =
    document.getElementById("salesBody");

const message =
    document.getElementById("message");

const salesForm =
    document.getElementById("salesForm");

const businessName =
    document.getElementById("businessName");

const welcomeText =
    document.getElementById("welcomeText");

const sidebarOwnerName =
    document.getElementById("sidebarOwnerName");

const topProfileImage =
    document.getElementById("topProfileImage");

const saveSaleBtn =
    document.getElementById("saveSaleBtn");

const alertContainer =
    document.getElementById("alertContainer");

const deleteModal =
    document.getElementById("deleteModal");

const cancelDeleteBtn =
    document.getElementById("cancelDeleteBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");


let allProducts = [];

let saleToDelete = null;


// ======================================================
// SHOW ALERT
// ======================================================

function showAlert(
    type,
    title,
    text
) {

    if (!alertContainer) {
        return;
    }


    const alert =
        document.createElement("div");


    alert.className =
        `custom-alert ${type}`;


    let icon =
        "fa-circle-info";


    if (type === "success") {

        icon =
            "fa-circle-check";

    }

    else if (type === "error") {

        icon =
            "fa-circle-exclamation";

    }

    else if (type === "warning") {

        icon =
            "fa-triangle-exclamation";

    }


    alert.innerHTML = `

        <div class="alert-icon">

            <i class="fa-solid ${icon}"></i>

        </div>

        <div class="alert-content">

            <strong>
                ${title}
            </strong>

            <span>
                ${text}
            </span>

        </div>

        <button
            class="alert-close"
            type="button"
        >

            <i class="fa-solid fa-xmark"></i>

        </button>

    `;


    alertContainer.appendChild(alert);


    requestAnimationFrame(() => {

        alert.classList.add("show");

    });


    const closeBtn =
        alert.querySelector(".alert-close");


    closeBtn.addEventListener(
        "click",
        function () {

            removeAlert(alert);

        }
    );


    setTimeout(
        function () {

            removeAlert(alert);

        },
        4500
    );

}



// ======================================================
// REMOVE ALERT
// ======================================================

function removeAlert(alert) {

    if (!alert) {
        return;
    }


    alert.classList.remove("show");


    setTimeout(
        function () {

            if (alert.parentNode) {

                alert.parentNode.removeChild(
                    alert
                );

            }

        },
        300
    );

}



// ======================================================
// LOAD USER
// ======================================================

async function loadUser() {

    try {

        const response = await fetch(
            "/user",
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Unable to load user"
            );

        }


        const user =
            await response.json();


        if (user.error) {

            window.location.href =
                "login.html";

            return;

        }


        // BUSINESS NAME

        if (businessName) {

            businessName.textContent =
                user.business ||
                "Business";

        }


        // WELCOME TEXT

        if (welcomeText) {

            welcomeText.textContent =
                "Sales Entry - " +
                (
                    user.fullname ||
                    "Administrator"
                );

        }


        // OWNER NAME

        if (sidebarOwnerName) {

            sidebarOwnerName.textContent =
                user.fullname ||
                "Business Owner";

        }


        // PROFILE IMAGE

        if (
            topProfileImage &&
            user.profile_image
        ) {

            topProfileImage.src =
                user.profile_image;

        }


    } catch (error) {

        console.log(
            "User loading error:",
            error
        );

    }

}



// ======================================================
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {

    try {

        const response = await fetch(
            "/products",
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Unable to load products"
            );

        }


        const products =
            await response.json();


        console.log(
            "Products received:",
            products
        );


        allProducts = products;


        product.innerHTML = `
            <option value="">
                Select Product
            </option>
        `;


        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            product.innerHTML = `
                <option value="">
                    No Products Available
                </option>
            `;

            availableStock.value =
                "0";

            return;

        }


        products.forEach(item => {

            const stock =
                Number(item.stock) || 0;


            let text =
                item.product_name;


            if (stock <= 0) {

                text +=
                    " (Out of Stock)";

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.product_name;


            option.textContent =
                text;


            option.disabled =
                stock <= 0;


            product.appendChild(
                option
            );

        });


    } catch (error) {

        console.log(
            "Products loading error:",
            error
        );


        product.innerHTML = `
            <option value="">
                Unable to load products
            </option>
        `;

    }

}



// ======================================================
// PRODUCT SELECT
// ======================================================

product.addEventListener(
    "change",
    function () {


        const selected =
            allProducts.find(
                p =>
                    p.product_name ===
                    product.value
            );


        if (selected) {

            price.value =
                Number(
                    selected.price
                ) || 0;


            availableStock.value =
                Number(
                    selected.stock
                ) || 0;


        } else {

            price.value =
                "";

            availableStock.value =
                "0";

        }


        quantity.value =
            "";


        calculateTotal();

    }
);



// ======================================================
// CALCULATE TOTAL
// ======================================================

function calculateTotal() {

    const qty =
        Number(quantity.value) || 0;


    const prc =
        Number(price.value) || 0;


    const calculated =
        qty * prc;


    total.value =
        calculated > 0
            ? calculated
            : "";

}



// ======================================================
// QUANTITY VALIDATION
// ======================================================

quantity.addEventListener(
    "input",
    function () {


        const stock =
            Number(
                availableStock.value
            ) || 0;


        const qty =
            Number(
                quantity.value
            ) || 0;


        if (
            stock > 0 &&
            qty > stock
        ) {

            quantity.value =
                stock;


            showAlert(
                "warning",
                "Stock Limit",
                "Quantity has been limited to the available stock."
            );

        }


        calculateTotal();

    }
);



// ======================================================
// LOAD SALES
// ======================================================

async function loadSales() {

    try {

        const response = await fetch(
            "/sales",
            {
                credentials: "include"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Unable to load sales"
            );

        }


        const sales =
            await response.json();


        console.log(
            "Sales received:",
            sales
        );


        salesBody.innerHTML =
            "";


        if (
            !Array.isArray(sales) ||
            sales.length === 0
        ) {

            salesBody.innerHTML = `

                <tr class="empty-row">

                    <td colspan="6">

                        <div class="empty-sales">

                            <div class="empty-sales-icon">

                                <i class="fa-solid fa-receipt"></i>

                            </div>

                            <strong>
                                No Sales Yet
                            </strong>

                            <span>
                                Your recorded sales will appear here.
                            </span>

                        </div>

                    </td>

                </tr>

            `;

            return;

        }


        sales.forEach(sale => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td class="product-cell">

                    <div class="product-name">

                        <span class="product-table-icon">

                            <i class="fa-solid fa-box"></i>

                        </span>

                        <span>
                            ${escapeHTML(
                                sale.product
                            )}
                        </span>

                    </div>

                </td>


                <td>

                    <span class="quantity-badge">

                        ${sale.quantity}

                    </span>

                </td>


                <td class="money-cell">

                    ₦${Number(
                        sale.price
                    ).toLocaleString()}

                </td>


                <td class="total-cell">

                    ₦${Number(
                        sale.total
                    ).toLocaleString()}

                </td>


                <td class="date-cell">

                    ${escapeHTML(
                        sale.sale_date
                    )}

                </td>


                <td>

                    <button
                        class="delete-btn"
                        type="button"
                        data-sale-id="${sale.id}"
                    >

                        <i class="fa-solid fa-trash"></i>

                        <span>
                            Delete
                        </span>

                    </button>

                </td>

            `;


            const deleteButton =
                row.querySelector(
                    ".delete-btn"
                );


            deleteButton.addEventListener(
                "click",
                function () {

                    openDeleteModal(
                        sale.id
                    );

                }
            );


            salesBody.appendChild(
                row
            );

        });


    } catch (error) {

        console.log(
            "Sales loading error:",
            error
        );


        salesBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="table-error"
                >

                    <i class="fa-solid fa-circle-exclamation"></i>

                    Unable to load sales.

                </td>

            </tr>

        `;

    }

}



// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value ?? "";


    return div.innerHTML;

}



// ======================================================
// SAVE SALE
// ======================================================

salesForm.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();


        const selectedProduct =
            allProducts.find(
                p =>
                    p.product_name ===
                    product.value
            );


        if (!selectedProduct) {

            showAlert(
                "error",
                "Product Required",
                "Please select a product before saving the sale."
            );

            return;

        }


        const qty =
            Number(quantity.value);


        const stock =
            Number(
                selectedProduct.stock
            );


        if (!Number.isFinite(qty) || qty <= 0) {

            showAlert(
                "error",
                "Invalid Quantity",
                "Please enter a valid quantity."
            );

            return;

        }


        if (qty > stock) {

            showAlert(
                "error",
                "Insufficient Stock",
                "Quantity cannot exceed the available stock."
            );

            return;

        }


        const sale = {

            product:
                product.value,

            quantity:
                qty,

            price:
                Number(price.value)

        };


        try {

            // DISABLE BUTTON

            if (saveSaleBtn) {

                saveSaleBtn.disabled =
                    true;

                saveSaleBtn.classList.add(
                    "loading"
                );

                saveSaleBtn.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Saving...
                    </span>

                `;

            }


            const response =
                await fetch(
                    "/add_sale",
                    {

                        method: "POST",

                        credentials: "include",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                sale
                            )

                    }
                );


            const data =
                await response.json();


            if (data.error) {

                showAlert(
                    "error",
                    "Sale Not Saved",
                    data.error
                );

                return;

            }


            showAlert(
                "success",
                "Sale Saved",
                data.message ||
                "Sale saved successfully."
            );


            salesForm.reset();


            availableStock.value =
                "0";

            price.value =
                "";

            total.value =
                "";


            await loadSales();

            await loadProducts();


        } catch (error) {

            console.log(
                "Save sale error:",
                error
            );


            showAlert(
                "error",
                "Connection Error",
                "Unable to connect to the server."
            );

        } finally {

            // RESTORE BUTTON

            if (saveSaleBtn) {

                saveSaleBtn.disabled =
                    false;

                saveSaleBtn.classList.remove(
                    "loading"
                );

                saveSaleBtn.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    <span>
                        Save Sale
                    </span>

                `;

            }

        }

    }
);



// ======================================================
// OPEN DELETE MODAL
// ======================================================

function openDeleteModal(id) {

    saleToDelete =
        id;


    if (!deleteModal) {
        return;
    }


    deleteModal.classList.add(
        "show"
    );


    document.body.classList.add(
        "modal-open"
    );

}



// ======================================================
// CLOSE DELETE MODAL
// ======================================================

function closeDeleteModal() {

    saleToDelete =
        null;


    if (deleteModal) {

        deleteModal.classList.remove(
            "show"
        );

    }


    document.body.classList.remove(
        "modal-open"
    );

}



// ======================================================
// CANCEL DELETE
// ======================================================

if (cancelDeleteBtn) {

    cancelDeleteBtn.addEventListener(
        "click",
        function () {

            closeDeleteModal();

        }
    );

}



// ======================================================
// CLICK OUTSIDE DELETE MODAL
// ======================================================

if (deleteModal) {

    deleteModal.addEventListener(
        "click",
        function (e) {

            if (
                e.target ===
                deleteModal
            ) {

                closeDeleteModal();

            }

        }
    );

}



// ======================================================
// CONFIRM DELETE
// ======================================================

if (confirmDeleteBtn) {

    confirmDeleteBtn.addEventListener(
        "click",
        async function () {

            if (!saleToDelete) {
                return;
            }


            const id =
                saleToDelete;


            confirmDeleteBtn.disabled =
                true;


            confirmDeleteBtn.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Deleting...

            `;


            try {

                const response =
                    await fetch(
                        "/delete_sale/" +
                        id,
                        {

                            method: "DELETE",

                            credentials: "include"

                        }
                    );


                const data =
                    await response.json();


                if (data.error) {

                    showAlert(
                        "error",
                        "Delete Failed",
                        data.error
                    );

                    return;

                }


                closeDeleteModal();


                showAlert(
                    "success",
                    "Sale Deleted",
                    "The sale has been removed successfully."
                );


                await loadSales();

                await loadProducts();


            } catch (error) {

                console.log(
                    "Delete sale error:",
                    error
                );


                showAlert(
                    "error",
                    "Delete Failed",
                    "Unable to connect to the server."
                );

            } finally {

                confirmDeleteBtn.disabled =
                    false;


                confirmDeleteBtn.innerHTML = `

                    <i class="fa-solid fa-trash"></i>

                    Delete

                `;

            }

        }
    );

}



// ======================================================
// ESC KEY FOR MODAL
// ======================================================

document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Escape" &&
            deleteModal &&
            deleteModal.classList.contains(
                "show"
            )
        ) {

            closeDeleteModal();

        }

    }
);



// ======================================================
// START APPLICATION
// ======================================================

window.addEventListener(
    "load",
    async function () {

        await loadUser();

        await loadProducts();

        await loadSales();

    }
);