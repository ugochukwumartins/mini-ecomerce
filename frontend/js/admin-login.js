const API_ORIGIN = window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:5000";
const API_BASE = `${API_ORIGIN}/api`;
const form = document.getElementById("loginForm");
const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const msg = document.getElementById("msg");
const forgotMsg = document.getElementById("forgotMsg");
const resetMsg = document.getElementById("resetMsg");

function showPanel(panel) {
  form.classList.toggle("hidden", panel !== "login");
  forgotForm.classList.toggle("hidden", panel !== "forgot");
  resetForm.classList.toggle("hidden", panel !== "reset");
}

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  msg.textContent = "Checking login...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await postJson("/admin/login", { email, password });

    localStorage.setItem("adminToken", data.token);
    location.href = "admin.html";
  } catch (error) {
    msg.textContent = error.message;
  }
});

forgotForm.addEventListener("submit", async event => {
  event.preventDefault();
  forgotMsg.textContent = "Generating reset code...";

  const email = document.getElementById("forgotEmail").value.trim();

  try {
    const data = await postJson("/admin/forgot-password", { email });
    document.getElementById("resetEmail").value = email;
    document.getElementById("resetCode").value = data.resetCode || "";
    forgotMsg.textContent = data.resetCode
      ? `Reset code: ${data.resetCode}. It expires in 15 minutes.`
      : data.message;
    showPanel("reset");
    resetMsg.textContent = data.resetCode ? "Enter your new password to finish." : data.message;
  } catch (error) {
    forgotMsg.textContent = error.message;
  }
});

resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  resetMsg.textContent = "Updating password...";

  const email = document.getElementById("resetEmail").value.trim();
  const resetCode = document.getElementById("resetCode").value.trim();
  const password = document.getElementById("newPassword").value;

  try {
    const data = await postJson("/admin/reset-password", { email, resetCode, password });
    resetMsg.textContent = data.message;
    document.getElementById("email").value = email;
    document.getElementById("password").value = "";
    setTimeout(() => {
      msg.textContent = "Password updated. Login with your new password.";
      showPanel("login");
    }, 900);
  } catch (error) {
    resetMsg.textContent = error.message;
  }
});

document.getElementById("showForgot").addEventListener("click", () => {
  document.getElementById("forgotEmail").value = document.getElementById("email").value.trim();
  showPanel("forgot");
});

document.querySelectorAll("[data-show-login]").forEach(button => {
  button.addEventListener("click", () => showPanel("login"));
});
