document.getElementById("urlForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const longUrl = document.getElementById("longUrl").value;

  try {
    const res = await fetch("/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ longUrl }),
    });

    const data = await res.json();

    if (data.shortUrl) {
      const resultDiv = document.getElementById("result");
      resultDiv.innerHTML = `
        ✅ Your Short URL: 
        <a href="${data.shortUrl}" target="_blank" class="fw-bold">${data.shortUrl}</a>
        <button class="btn btn-outline-secondary btn-sm ms-2" onclick="copyUrl('${data.shortUrl}')">📋 Copy</button>
      `;
      resultDiv.classList.remove("d-none");
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong!");
  }
});

function copyUrl(url) {
  navigator.clipboard.writeText(url);
  alert("✅ Copied: " + url);
}
