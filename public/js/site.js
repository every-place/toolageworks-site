// Progressive enhancement: the form works as a plain POST without this script.
(() => {
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const form = document.getElementById("contact-form");
  if (!form) return;
  const note = form.querySelector(".form-note");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    note.className = "form-note";
    if (!form.checkValidity()) {
      note.textContent = "Please add your name, a valid email, and a message.";
      note.classList.add("err");
      form.reportValidity();
      return;
    }
    button.disabled = true;
    note.textContent = "Sending…";
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      form.reset();
      note.textContent = "Thanks! Your message is in. I'll reply within two business days.";
      note.classList.add("ok");
    } catch (err) {
      note.textContent = `${err.message} You can also email admin@toolageworks.com.`;
      note.classList.add("err");
    } finally {
      button.disabled = false;
    }
  });
})();
