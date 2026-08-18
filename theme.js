// SHARED THEME SYSTEM

(function () {

    const savedTheme = localStorage.getItem("settingsTheme") || "dark";

    document.documentElement.setAttribute("data-theme", savedTheme);

    document.body.classList.remove("light-mode", "dark-mode");
    document.body.classList.add(savedTheme === "light" ? "light-mode" : "dark-mode");

})();