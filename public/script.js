// public/script.js
const token = () => localStorage.getItem('token');

function showAppIfAuthed() {
  if (token()) {
    document.getElementById('authBlock').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadMyUrls();
  } else {
    document.getElementById('authBlock').style.display = 'block';
    document.getElementById('app').style.display = 'none';
  }
}

async function shorten() {
  const longUrl = document.getElementById('longUrl').value.trim();
  if (!longUrl) return alert('Enter a URL');
  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token()
      },
      body: JSON.stringify({ longUrl })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to shorten');
    document.getElementById('result').innerHTML = `Short URL: <a href="${data.shortUrl}" target="_blank">${data.shortUrl}</a>`;
    loadMyUrls();
  } catch (err) {
    alert('Network error');
  }
}

document.getElementById('shortenBtn').addEventListener('click', shorten);
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  showAppIfAuthed();
});

async function loadMyUrls() {
  try {
    const res = await fetch('/api/my-urls', {
      headers: { Authorization: 'Bearer ' + token() }
    });
    if (!res.ok) {
      document.getElementById('myUrls').innerText = 'No URLs or not logged in';
      return;
    }
    const rows = await res.json();
    if (!rows.length) {
      document.getElementById('myUrls').innerText = 'You have no shortened URLs yet.';
      return;
    }
    const container = document.getElementById('myUrls');
    container.innerHTML = rows.map(r =>
      `<div>
         <a href="${process.env?.BASE_URL || window.location.origin}/u/${r.short_code}" target="_blank">${window.location.origin}/u/${r.short_code}</a>
         &nbsp; → &nbsp;<a href="${r.long_url}" target="_blank">${r.long_url}</a>
         &nbsp; (clicks: ${r.clicks || 0})
       </div>`
    ).join('');
  } catch (err) {
    document.getElementById('myUrls').innerText = 'Failed to load URLs';
  }
}

showAppIfAuthed();
