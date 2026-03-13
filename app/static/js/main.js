/* GuideWire Cloud — main.js */

/* Auto-dismiss flash messages after 6 seconds */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".alert").forEach((el) => {
    setTimeout(() => el.remove(), 6000);
  });

  /* Coverage option highlight on radio change */
  document.querySelectorAll(".coverage-option input[type=radio]").forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".coverage-option").forEach((opt) =>
        opt.classList.remove("selected")
      );
      radio.closest(".coverage-option").classList.add("selected");
    });
  });
});
