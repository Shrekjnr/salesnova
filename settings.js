// =====================================================
// SETTINGS.JS
// COMPLETE SETTINGS PAGE JAVASCRIPT
// DARK MODE / LIGHT MODE WORKS ACROSS ALL PAGES
// =====================================================

const API = "http://127.0.0.1:5000";


// =====================================================
// GLOBAL THEME SYSTEM
// =====================================================

// Get saved theme
function getSavedTheme() {

    const savedTheme =
        localStorage.getItem("settingsTheme");

    if (
        savedTheme === "light" ||
        savedTheme === "dark"
    ) {

        return savedTheme;

    }

    return "dark";

}


// =====================================================
// APPLY THEME
// =====================================================

function applyTheme(theme) {

    if (
        theme !== "light" &&
        theme !== "dark"
    ) {

        theme = "dark";

    }


    // Apply theme to HTML
    document.documentElement.setAttribute(
        "data-theme",
        theme
    );


    // Apply theme to BODY
    document.body.classList.remove(
        "light-mode",
        "dark-mode"
    );

    document.body.classList.add(
        theme === "light"
            ? "light-mode"
            : "dark-mode"
    );


    // Save theme
    localStorage.setItem(
        "settingsTheme",
        theme
    );


    // =================================================
    // UPDATE THEME ICON
    // =================================================

    const themeIcon =
        document.getElementById("themeIcon");


    if (themeIcon) {

        themeIcon.className =
            theme === "light"
                ? "fa-solid fa-sun"
                : "fa-solid fa-moon";

    }


    // =================================================
    // UPDATE THEME TEXT
    // =================================================

    const themeText =
        document.getElementById("themeText");


    if (themeText) {

        themeText.textContent =
            theme === "light"
                ? "Light Mode"
                : "Dark Mode";

    }


    // =================================================
    // UPDATE APPEARANCE OPTIONS
    // =================================================

    document
        .querySelectorAll(".appearance-option")
        .forEach(function (option) {

            option.classList.toggle(
                "active",
                option.dataset.theme === theme
            );

        });

}


// =====================================================
// APPLY SAVED THEME IMMEDIATELY
// =====================================================

const initialTheme =
    getSavedTheme();


// Apply to HTML immediately
document.documentElement.setAttribute(
    "data-theme",
    initialTheme
);


// =====================================================
// ELEMENTS
// =====================================================

const sidebar =
    document.getElementById("sidebar");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");


// =====================================================
// MOBILE SIDEBAR
// =====================================================

if (mobileMenuBtn && sidebar) {

    mobileMenuBtn.addEventListener(
        "click",
        function () {

            sidebar.classList.toggle(
                "mobile-open"
            );


            if (sidebarOverlay) {

                sidebarOverlay.classList.toggle(
                    "show"
                );

            }

        }
    );

}


if (sidebarOverlay && sidebar) {

    sidebarOverlay.addEventListener(
        "click",
        function () {

            sidebar.classList.remove(
                "mobile-open"
            );


            sidebarOverlay.classList.remove(
                "show"
            );

        }
    );

}


// =====================================================
// CLOSE SIDEBAR AFTER NAVIGATION
// =====================================================

document
    .querySelectorAll(".nav-item")
    .forEach(function (item) {

        item.addEventListener(
            "click",
            function () {

                if (sidebar) {

                    sidebar.classList.remove(
                        "mobile-open"
                    );

                }


                if (sidebarOverlay) {

                    sidebarOverlay.classList.remove(
                        "show"
                    );

                }

            }
        );

    });


// =====================================================
// TOAST NOTIFICATION
// =====================================================

function showToast(
    message,
    isError = false
) {

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast || !toastMessage) {

        alert(message);

        return;

    }


    toastMessage.textContent =
        message;


    toast.classList.toggle(
        "error",
        isError
    );


    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


// =====================================================
// MODAL FUNCTIONS
// =====================================================

function openModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


function closeModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// =====================================================
// CLOSE MODAL BUTTONS
// =====================================================

document
    .querySelectorAll("[data-close]")
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                closeModal(
                    this.dataset.close
                );

            }
        );

    });


// =====================================================
// CLOSE MODAL OUTSIDE
// =====================================================

document
    .querySelectorAll(".modal-overlay")
    .forEach(function (overlay) {

        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    overlay.classList.remove(
                        "show"
                    );

                }

            }
        );

    });


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadProfile() {

    try {

        const response =
            await fetch(
                API + "/profile",
                {
                    credentials: "include"
                }
            );


        if (!response.ok) {

            if (
                response.status === 401
            ) {

                window.location.href =
                    "login.html";

            }

            return;

        }


        const user =
            await response.json();


        console.log(
            "Profile loaded:",
            user
        );


        // =================================================
        // SIDEBAR BUSINESS NAME
        // =================================================

        const sidebarBusinessName =
            document.querySelector(
                ".sidebar-logo .logo-text"
            );


        if (sidebarBusinessName) {

            sidebarBusinessName.textContent =
                user.business ||
                "My Business";

        }


        // =================================================
        // PROFILE NAME
        // =================================================

        const profileName =
            document.getElementById(
                "profileName"
            );


        if (profileName) {

            profileName.textContent =
                user.fullname ||
                "User";

        }


        // =================================================
        // PROFILE BUSINESS
        // =================================================

        const profileBusiness =
            document.getElementById(
                "profileBusiness"
            );


        if (profileBusiness) {

            profileBusiness.textContent =
                user.business ||
                "Business Owner";

        }


        // =================================================
        // SIDEBAR USER NAME
        // =================================================

        const sidebarUserName =
            document.getElementById(
                "sidebarUserName"
            );


        if (sidebarUserName) {

            sidebarUserName.textContent =
                user.fullname ||
                "User";

        }


        // =================================================
        // PROFILE FORM
        // =================================================

        const fullname =
            document.getElementById(
                "fullname"
            );

        const business =
            document.getElementById(
                "business"
            );

        const email =
            document.getElementById(
                "email"
            );

        const phone =
            document.getElementById(
                "phone"
            );

        const address =
            document.getElementById(
                "address"
            );

        const category =
            document.getElementById(
                "category"
            );

        const description =
            document.getElementById(
                "description"
            );


        if (fullname) {

            fullname.value =
                user.fullname || "";

        }


        if (business) {

            business.value =
                user.business || "";

        }


        if (email) {

            email.value =
                user.email || "";

        }


        if (phone) {

            phone.value =
                user.phone || "";

        }


        if (address) {

            address.value =
                user.address || "";

        }


        if (category) {

            category.value =
                user.category || "";

        }


        if (description) {

            description.value =
                user.description || "";

        }


        // =================================================
        // SECURITY EMAIL
        // =================================================

        const securityEmail =
            document.getElementById(
                "securityEmail"
            );


        if (securityEmail) {

            securityEmail.textContent =
                user.email ||
                "Not available";

        }


        // =================================================
        // PROFILE IMAGE
        // =================================================

        let imageURL;


        if (user.profile_picture) {

            imageURL =
                API +
                "/uploads/" +
                user.profile_picture +
                "?t=" +
                Date.now();

        }

        else {

            imageURL =
                "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(
                    user.fullname ||
                    "User"
                ) +
                "&background=2563eb&color=ffffff&size=150";

        }


        // =================================================
        // PROFILE IMAGE
        // =================================================

        const profileImage =
            document.getElementById(
                "profileImage"
            );


        if (profileImage) {

            profileImage.src =
                imageURL;

        }


        // =================================================
        // SIDEBAR PROFILE IMAGE
        // =================================================

        const sidebarProfileImage =
            document.getElementById(
                "sidebarProfileImage"
            );


        if (sidebarProfileImage) {

            sidebarProfileImage.src =
                imageURL;

        }


        // =================================================
        // PROFILE PREVIEW
        // =================================================

        const profilePreview =
            document.getElementById(
                "profilePreview"
            );


        if (profilePreview) {

            profilePreview.src =
                imageURL;

        }


        // =================================================
        // TOP PROFILE IMAGE
        // =================================================

        const topProfileImage =
            document.getElementById(
                "topProfileImage"
            );


        if (topProfileImage) {

            topProfileImage.src =
                imageURL;

        }

    }

    catch (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );


        showToast(
            "Unable to load profile.",
            true
        );

    }

}


// =====================================================
// PROFILE INFORMATION
// =====================================================

const profileInfoBtn =
    document.getElementById(
        "profileInfoBtn"
    );


if (profileInfoBtn) {

    profileInfoBtn.addEventListener(
        "click",
        function () {

            openModal(
                "profileModal"
            );

        }
    );

}


// =====================================================
// SAVE PROFILE
// =====================================================

const profileForm =
    document.getElementById(
        "profileForm"
    );


if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const fullname =
                document.getElementById(
                    "fullname"
                ).value.trim();


            const business =
                document.getElementById(
                    "business"
                ).value.trim();


            const phone =
                document.getElementById(
                    "phone"
                ).value.trim();


            const address =
                document.getElementById(
                    "address"
                ).value.trim();


            const category =
                document.getElementById(
                    "category"
                ).value.trim();


            const description =
                document.getElementById(
                    "description"
                ).value.trim();


            if (
                !fullname ||
                !business
            ) {

                showToast(
                    "Full name and business name are required.",
                    true
                );

                return;

            }


            try {

                const response =
                    await fetch(
                        API +
                        "/update_profile",
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    fullname:
                                        fullname,

                                    business:
                                        business,

                                    phone:
                                        phone,

                                    address:
                                        address,

                                    category:
                                        category,

                                    description:
                                        description

                                })

                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    showToast(
                        result.message ||
                        result.error ||
                        "Failed to update profile.",
                        true
                    );

                    return;

                }


                const profileName =
                    document.getElementById(
                        "profileName"
                    );


                if (profileName) {

                    profileName.textContent =
                        fullname;

                }


                const profileBusiness =
                    document.getElementById(
                        "profileBusiness"
                    );


                if (profileBusiness) {

                    profileBusiness.textContent =
                        business;

                }


                const sidebarUserName =
                    document.getElementById(
                        "sidebarUserName"
                    );


                if (sidebarUserName) {

                    sidebarUserName.textContent =
                        fullname;

                }


                const sidebarBusinessName =
                    document.querySelector(
                        ".sidebar-logo .logo-text"
                    );


                if (sidebarBusinessName) {

                    sidebarBusinessName.textContent =
                        business;

                }


                closeModal(
                    "profileModal"
                );


                showToast(
                    "Profile updated successfully."
                );


                await loadProfile();

            }

            catch (error) {

                console.error(
                    "PROFILE UPDATE ERROR:",
                    error
                );


                showToast(
                    "Unable to update profile.",
                    true
                );

            }

        }
    );

}


// =====================================================
// CHANGE PASSWORD BUTTON
// =====================================================

const passwordBtn =
    document.getElementById(
        "passwordBtn"
    );


if (passwordBtn) {

    passwordBtn.addEventListener(
        "click",
        function () {

            openModal(
                "passwordModal"
            );

        }
    );

}


// =====================================================
// CHANGE PASSWORD
// =====================================================

const passwordForm =
    document.getElementById(
        "passwordForm"
    );


if (passwordForm) {

    passwordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const currentPasswordInput =
                document.getElementById(
                    "currentPassword"
                );


            const newPasswordInput =
                document.getElementById(
                    "newPassword"
                );


            const confirmPasswordInput =
                document.getElementById(
                    "confirmPassword"
                );


            if (
                !currentPasswordInput ||
                !newPasswordInput ||
                !confirmPasswordInput
            ) {

                showToast(
                    "Password fields could not be found.",
                    true
                );

                return;

            }


            const currentPassword =
                currentPasswordInput.value.trim();


            const newPassword =
                newPasswordInput.value.trim();


            const confirmPassword =
                confirmPasswordInput.value.trim();


            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {

                showToast(
                    "Please fill in all password fields.",
                    true
                );

                return;

            }


            if (
                newPassword.length < 6
            ) {

                showToast(
                    "New password must contain at least 6 characters.",
                    true
                );

                return;

            }


            if (
                newPassword !==
                confirmPassword
            ) {

                showToast(
                    "New passwords do not match.",
                    true
                );

                return;

            }


            if (
                currentPassword ===
                newPassword
            ) {

                showToast(
                    "New password must be different from your current password.",
                    true
                );

                return;

            }


            try {

                const response =
                    await fetch(
                        API +
                        "/change_password",
                        {
                            method: "PUT",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    current_password:
                                        currentPassword,

                                    new_password:
                                        newPassword,

                                    confirm_password:
                                        confirmPassword

                                })

                        }
                    );


                let result = {};


                try {

                    result =
                        await response.json();

                }

                catch (error) {

                    console.error(
                        "INVALID SERVER RESPONSE:",
                        error
                    );

                }


                if (!response.ok) {

                    showToast(
                        result.message ||
                        result.error ||
                        "Unable to change password.",
                        true
                    );

                    return;

                }


                passwordForm.reset();


                closeModal(
                    "passwordModal"
                );


                showToast(
                    result.message ||
                    "Password changed successfully."
                );

            }

            catch (error) {

                console.error(
                    "PASSWORD ERROR:",
                    error
                );


                showToast(
                    "Unable to connect to the server.",
                    true
                );

            }

        }
    );

}


// =====================================================
// PASSWORD VISIBILITY
// =====================================================

document
    .querySelectorAll(".password-eye")
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const input =
                    document.getElementById(
                        this.dataset.target
                    );


                const icon =
                    this.querySelector("i");


                if (!input) {

                    return;

                }


                if (
                    input.type ===
                    "password"
                ) {

                    input.type =
                        "text";


                    if (icon) {

                        icon.classList.remove(
                            "fa-eye"
                        );

                        icon.classList.add(
                            "fa-eye-slash"
                        );

                    }

                }

                else {

                    input.type =
                        "password";


                    if (icon) {

                        icon.classList.remove(
                            "fa-eye-slash"
                        );

                        icon.classList.add(
                            "fa-eye"
                        );

                    }

                }

            }
        );

    });


// =====================================================
// APPEARANCE BUTTON
// =====================================================

const appearanceBtn =
    document.getElementById(
        "appearanceBtn"
    );


if (appearanceBtn) {

    appearanceBtn.addEventListener(
        "click",
        function () {

            openModal(
                "appearanceModal"
            );

        }
    );

}


// =====================================================
// APPLY SAVED THEME TO SETTINGS PAGE
// =====================================================

applyTheme(
    getSavedTheme()
);


// =====================================================
// TOP DARK/LIGHT MODE BUTTON
// =====================================================

const themeButton =
    document.getElementById(
        "themeButton"
    );


if (themeButton) {

    themeButton.addEventListener(
        "click",
        function () {

            const currentTheme =
                getSavedTheme();


            const newTheme =
                currentTheme === "dark"
                    ? "light"
                    : "dark";


            applyTheme(
                newTheme
            );

        }
    );

}


// =====================================================
// APPEARANCE OPTIONS
// =====================================================

document
    .querySelectorAll(
        ".appearance-option"
    )
    .forEach(function (option) {

        option.addEventListener(
            "click",
            function () {

                const theme =
                    this.dataset.theme;


                applyTheme(
                    theme
                );

            }
        );

    });


// =====================================================
// SECURITY BUTTON
// =====================================================

const securityBtn =
    document.getElementById(
        "securityBtn"
    );


if (securityBtn) {

    securityBtn.addEventListener(
        "click",
        function () {

            openModal(
                "securityModal"
            );

        }
    );

}


// =====================================================
// PRIVACY BUTTON
// =====================================================

const privacyBtn =
    document.getElementById(
        "privacyBtn"
    );


if (privacyBtn) {

    privacyBtn.addEventListener(
        "click",
        function () {

            openModal(
                "privacyModal"
            );

        }
    );

}


// =====================================================
// NOTIFICATIONS
// =====================================================

const notificationToggle =
    document.getElementById(
        "notificationToggle"
    );


if (notificationToggle) {

    const savedNotifications =
        localStorage.getItem(
            "notificationsEnabled"
        );


    if (
        savedNotifications !== null
    ) {

        notificationToggle.checked =
            savedNotifications ===
            "true";

    }


    notificationToggle.addEventListener(
        "change",
        function () {

            localStorage.setItem(
                "notificationsEnabled",
                this.checked
            );


            showToast(
                this.checked
                    ? "Notifications enabled."
                    : "Notifications disabled."
            );

        }
    );

}


// =====================================================
// PROFILE PICTURE
// =====================================================

const profilePicture =
    document.getElementById(
        "profilePicture"
    );


if (profilePicture) {

    profilePicture.addEventListener(
        "change",
        async function () {

            const file =
                this.files[0];


            if (!file) {

                return;

            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/jpg",
                "image/webp"
            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                showToast(
                    "Please select a valid image.",
                    true
                );


                this.value = "";


                return;

            }


            const previewURL =
                URL.createObjectURL(
                    file
                );


            const profileImage =
                document.getElementById(
                    "profileImage"
                );


            const sidebarImage =
                document.getElementById(
                    "sidebarProfileImage"
                );


            const profilePreview =
                document.getElementById(
                    "profilePreview"
                );


            const topImage =
                document.getElementById(
                    "topProfileImage"
                );


            if (profileImage) {

                profileImage.src =
                    previewURL;

            }


            if (sidebarImage) {

                sidebarImage.src =
                    previewURL;

            }


            if (profilePreview) {

                profilePreview.src =
                    previewURL;

            }


            if (topImage) {

                topImage.src =
                    previewURL;

            }


            const formData =
                new FormData();


            formData.append(
                "profile_picture",
                file
            );


            try {

                const response =
                    await fetch(
                        API +
                        "/upload_profile_picture",
                        {
                            method: "POST",

                            credentials: "include",

                            body:
                                formData
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    showToast(
                        result.message ||
                        result.error ||
                        "Image upload failed.",
                        true
                    );

                    return;

                }


                if (
                    result.profile_picture
                ) {

                    const imageURL =
                        API +
                        "/uploads/" +
                        result.profile_picture +
                        "?t=" +
                        Date.now();


                    if (profileImage) {

                        profileImage.src =
                            imageURL;

                    }


                    if (sidebarImage) {

                        sidebarImage.src =
                            imageURL;

                    }


                    if (profilePreview) {

                        profilePreview.src =
                            imageURL;

                    }


                    if (topImage) {

                        topImage.src =
                            imageURL;

                    }

                }


                showToast(
                    "Profile picture updated."
                );

            }

            catch (error) {

                console.error(
                    "IMAGE UPLOAD ERROR:",
                    error
                );


                showToast(
                    "Unable to upload profile picture.",
                    true
                );

            }

        }
    );

}


// =====================================================
// DELETE ACCOUNT BUTTON
// =====================================================

const deleteAccountBtn =
    document.getElementById(
        "deleteAccountBtn"
    );


if (deleteAccountBtn) {

    deleteAccountBtn.addEventListener(
        "click",
        function () {

            openModal(
                "deleteModal"
            );

        }
    );

}


// =====================================================
// CONFIRM DELETE ACCOUNT
// =====================================================

const confirmDeleteBtn =
    document.getElementById(
        "confirmDeleteBtn"
    );


if (confirmDeleteBtn) {

    confirmDeleteBtn.addEventListener(
        "click",
        async function () {

            try {

                const response =
                    await fetch(
                        API +
                        "/delete_account",
                        {
                            method: "DELETE",

                            credentials: "include"
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    showToast(
                        result.message ||
                        result.error ||
                        "Unable to delete account.",
                        true
                    );

                    return;

                }


                showToast(
                    "Account deleted successfully."
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "login.html";

                    },
                    1500
                );

            }

            catch (error) {

                console.error(
                    "DELETE ACCOUNT ERROR:",
                    error
                );


                showToast(
                    "Unable to delete account.",
                    true
                );

            }

        }
    );

}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            try {

                await fetch(
                    API + "/logout",
                    {
                        credentials:
                            "include"
                    }
                );

            }

            catch (error) {

                console.error(
                    "LOGOUT ERROR:",
                    error
                );

            }


            window.location.href =
                "login.html";

        }
    );

}


// =====================================================
// INITIALIZE SETTINGS PAGE
// =====================================================

loadProfile();