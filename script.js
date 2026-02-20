const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhs9RliTjFO1ZdkeQ64-agMpuK_QIGdPvfE8xc8wvhr5pja4n1M16P0pTcZyK48LGz1A/exec";

async function callAPI(payload) {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return await response.json();
}

document.getElementById('drop-zone').onclick = () => document.getElementById('fileInput').click();
document.getElementById('fileInput').onchange = e => processFile(e.target.files[0]);

function processFile(file) {
  if (!file) return;
  const cust = document.getElementById('custSelect').value;
  document.getElementById('loader').style.display = "block";
  const reader = new FileReader();
  reader.onload = async (e) => {
    const res = await callAPI({
      action: "upload",
      customer: cust,
      base64Data: e.target.result,
      fileName: file.name
    });
    document.getElementById('loader').style.display = "none";
    document.getElementById('status').innerHTML = res.success ? `✅ ${res.message}` : `❌ ${res.message}`;
    if(res.success) document.getElementById('showDataBtn').style.display = "block";
  };
  reader.readAsDataURL(file);
}

async function fetchData() {
  const cust = document.getElementById('custSelect').value;
  document.getElementById('loader').style.display = "block";
  const res = await callAPI({ action: "fetch", customer: cust });
  
  document.getElementById('loader').style.display = "none";
  if (res.success && res.rows.length > 0) {
    const tableBody = document.querySelector('#previewTable tbody');
    tableBody.innerHTML = "";
    document.getElementById('tableWrapper').style.display = "block";
    
    // Logika UI Filter Kuning
    const filterDiv = document.getElementById('filterContainer');
    const optText = document.getElementById('filterOptionText');
    if (cust === "SUZUKI") {
      filterDiv.style.display = "block";
      optText.innerText = "Tanpa Part Opuco (Kolom A Exclude)";
    } else if (cust === "ADM_SAP") {
      filterDiv.style.display = "block";
      optText.innerText = "Tanpa Part KBI-2 (Kolom B Exclude)";
    } else {
      filterDiv.style.display = "none";
    }

    res.rows.forEach(r => {
      const tr = document.createElement('tr');
      r.forEach(c => { const td = document.createElement('td'); td.innerText = c || ""; tr.appendChild(td); });
      tableBody.appendChild(tr);
    });
    document.getElementById('exportBtn').style.display = "block";
  }
}

async function doDownload() {
  const filterType = document.getElementById('filterSelect').value;
  document.getElementById('status').innerHTML = "Menyiapkan file... ⏳";
  const res = await callAPI({ action: "download", filterType: filterType });
  
  if (res.success) {
    const link = document.createElement('a');
    link.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + res.data;
    link.download = res.name;
    link.click();
    document.getElementById('status').innerHTML = "✅ Download Selesai!";
  }
}

async function resetApp() {
  if (confirm("Hapus sesi?")) {
    const res = await callAPI({ action: "clear" });
    location.reload();
  }

}
// Handle Paste (Suzuki Image & Excel Text)
document.addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  const cust = document.getElementById('custSelect').value;
  
  for (let i = 0; i < items.length; i++) {
    // 1. Jika yang di-paste adalah GAMBAR (QR Suzuki)
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = async (event) => {
        document.getElementById('loader').style.display = "block";
        const res = await callAPI({
          action: "upload",
          customer: cust,
          base64Data: event.target.result,
          fileName: "pasted_image.png"
        });
        handleResponse(res);
      };
      reader.readAsDataURL(blob);
    } 
    // 2. Jika yang di-paste adalah TEKS (Copy dari Excel)
    else if (items[i].kind === "string" && items[i].type === "text/plain") {
      items[i].getAsString(async (text) => {
        if (text.includes('\t')) { // Cek apakah format tabulasi Excel
          document.getElementById('loader').style.display = "block";
          const res = await callAPI({
            action: "paste_text", // Kita tambahkan action baru
            customer: cust,
            rawText: text
          });
          handleResponse(res);
        }
      });
    }
  }
});

// Fungsi pembantu untuk menangani hasil API
function handleResponse(res) {
  document.getElementById('loader').style.display = "none";
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = res.success ? `<b style="color:green">✅ ${res.message}</b>` : `<div style="color:red">Error: ${res.message}</div>`;
  if (res.success) {
    document.getElementById('showDataBtn').style.display = "block";
  }
}
