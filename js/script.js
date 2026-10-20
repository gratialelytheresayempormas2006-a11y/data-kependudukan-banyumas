/* ==========================================================
   Logika halaman Data Kependudukan Kabupaten Banyumas
   - Memuat data dari data/data.json
   - Menampilkan kartu, grafik (Chart.js), dan tabel
   - Tanpa localStorage (status disimpan di variabel biasa)
   ========================================================== */

// ---------- Status aplikasi ----------
const status = {
  dataJson: null,                                  // isi data.json
  tahunDipilih: null,                              // tahun pada dropdown
  urutan: { kolom: "kecamatan", arah: "asc" },     // pengurutan tabel
  kataCari: "",                                    // kata kunci pencarian
  tema: window.matchMedia("(prefers-color-scheme: dark)").matches ? "gelap" : "terang",
};

let grafikTren = null;       // objek Chart garis
let grafikKecamatan = null;  // objek Chart batang

// Pemformat angka gaya Indonesia (titik sebagai pemisah ribuan)
const formatAngka = new Intl.NumberFormat("id-ID");

// ---------- Pengambil elemen ----------
const el = {
  pilihTahun: document.getElementById("pilihTahun"),
  totalLahir: document.getElementById("totalLahir"),
  totalMati: document.getElementById("totalMati"),
  totalSelisih: document.getElementById("totalSelisih"),
  ketLahir: document.getElementById("ketLahir"),
  ketMati: document.getElementById("ketMati"),
  subBatang: document.getElementById("subBatang"),
  subTabel: document.getElementById("subTabel"),
  kotakCari: document.getElementById("kotakCari"),
  tabelBody: document.querySelector("#tabelData tbody"),
  tabelFoot: document.querySelector("#tabelData tfoot"),
  tabelHead: document.querySelectorAll("#tabelData thead th"),
  footerSumber: document.getElementById("footerSumber"),
  footerTahun: document.getElementById("footerTahun"),
  bannerContoh: document.getElementById("bannerContoh"),
  bannerGalat: document.getElementById("bannerGalat"),
  tombolTema: document.getElementById("tombolTema"),
  ikonTema: document.getElementById("ikonTema"),
  teksTema: document.getElementById("teksTema"),
};

// ---------- Memuat data ----------
async function muatData() {
  try {
    const respons = await fetch("data/data.json");
    if (!respons.ok) throw new Error("HTTP " + respons.status);
    status.dataJson = await respons.json();
    mulai();
  } catch (galat) {
    // fetch tidak jalan bila file dibuka langsung (file://), harus lewat server lokal
    el.bannerGalat.hidden = false;
    el.bannerGalat.innerHTML =
      "Data gagal dimuat. Jalankan halaman ini lewat server lokal " +
      "(misalnya ekstensi <strong>Live Server</strong> di VS Code), " +
      "jangan dibuka langsung dari file. Detail: " + galat.message;
  }
}

// ---------- Inisialisasi setelah data siap ----------
function mulai() {
  const { meta, data } = status.dataJson;

  // Daftar tahun diurutkan, tahun terbaru jadi pilihan awal
  const daftarTahun = Object.keys(data).sort();
  status.tahunDipilih = daftarTahun[daftarTahun.length - 1];

  el.pilihTahun.innerHTML = daftarTahun
    .map((t) => `<option value="${t}">${t}</option>`)
    .join("");
  el.pilihTahun.value = status.tahunDipilih;

  // Footer dan banner data contoh
  el.footerSumber.textContent = meta.sumber;
  el.footerTahun.textContent = meta.tahunPembaruan;
  el.bannerContoh.hidden = !meta.dataContoh;

  terapkanTema();
  renderSemua();
  pasangEvent();
}

// ---------- Perhitungan ----------
// Mengubah data satu tahun menjadi baris tabel lengkap dengan selisih
function ambilBaris(tahun) {
  return status.dataJson.data[tahun].map((k) => ({
    kecamatan: k.kecamatan,
    kelahiran: k.kelahiran,
    kematian: k.kematian,
    selisih: k.kelahiran - k.kematian,
  }));
}

function jumlahkan(baris) {
  const lahir = baris.reduce((a, b) => a + b.kelahiran, 0);
  const mati = baris.reduce((a, b) => a + b.kematian, 0);
  return { lahir, mati, selisih: lahir - mati };
}

// ---------- Render ----------
function renderSemua() {
  renderKartu();
  renderGrafikTren();
  renderGrafikKecamatan();
  renderTabel();
}

// Kartu ringkasan untuk tahun terpilih
function renderKartu() {
  const total = jumlahkan(ambilBaris(status.tahunDipilih));
  el.totalLahir.textContent = formatAngka.format(total.lahir);
  el.totalMati.textContent = formatAngka.format(total.mati);
  el.ketLahir.textContent = "jiwa pada tahun " + status.tahunDipilih;
  el.ketMati.textContent = "jiwa pada tahun " + status.tahunDipilih;

  const tanda = total.selisih > 0 ? "+" : "";
  el.totalSelisih.textContent = tanda + formatAngka.format(total.selisih);
  el.totalSelisih.className = "kartu__nilai " + (total.selisih >= 0 ? "positif" : "negatif");
}

// Warna grafik menyesuaikan tema terang/gelap
function warnaGrafik() {
  const gelap = status.tema === "gelap";
  return {
    teks: gelap ? "#cbd7e4" : "#40526a",
    garis: gelap ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    biru: gelap ? "#5aa2ff" : "#1d6fd8",
    hijau: gelap ? "#3ccf94" : "#1f9d6b",
    merah: gelap ? "#ff7a70" : "#d6453d",
  };
}

// Grafik garis: tren seluruh tahun
function renderGrafikTren() {
  const w = warnaGrafik();
  const daftarTahun = Object.keys(status.dataJson.data).sort();
  const lahir = [];
  const mati = [];

  daftarTahun.forEach((t) => {
    const total = jumlahkan(ambilBaris(t));
    lahir.push(total.lahir);
    mati.push(total.mati);
  });

  // Titik pada tahun terpilih dibuat lebih besar sebagai penanda
  const ukuranTitik = daftarTahun.map((t) => (t === status.tahunDipilih ? 8 : 4));

  if (grafikTren) grafikTren.destroy();
  grafikTren = new Chart(document.getElementById("grafikTren"), {
    type: "line",
    data: {
      labels: daftarTahun,
      datasets: [
        { label: "Kelahiran", data: lahir, borderColor: w.biru, backgroundColor: w.biru,
          pointRadius: ukuranTitik, tension: 0.3, borderWidth: 3 },
        { label: "Kematian", data: mati, borderColor: w.merah, backgroundColor: w.merah,
          pointRadius: ukuranTitik, tension: 0.3, borderWidth: 3 },
      ],
    },
    options: opsiDasar(w, false),
  });
}

// Grafik batang: perbandingan per kecamatan pada tahun terpilih
function renderGrafikKecamatan() {
  const w = warnaGrafik();
  const baris = ambilBaris(status.tahunDipilih);
  el.subBatang.textContent = "Tahun " + status.tahunDipilih;

  if (grafikKecamatan) grafikKecamatan.destroy();
  grafikKecamatan = new Chart(document.getElementById("grafikKecamatan"), {
    type: "bar",
    data: {
      labels: baris.map((b) => b.kecamatan),
      datasets: [
        { label: "Kelahiran", data: baris.map((b) => b.kelahiran),
          backgroundColor: w.biru, borderRadius: 4 },
        { label: "Kematian", data: baris.map((b) => b.kematian),
          backgroundColor: w.merah, borderRadius: 4 },
      ],
    },
    // indexAxis "y" membuat batang horizontal agar nama kecamatan terbaca di HP
    options: { ...opsiDasar(w, true), indexAxis: "y" },
  });
}

// Opsi umum kedua grafik
function opsiDasar(w, horizontal) {
  const skalaAngka = {
    beginAtZero: true,
    ticks: { color: w.teks },
    grid: { color: w.garis },
  };
  const skalaKategori = { ticks: { color: w.teks }, grid: { color: w.garis } };

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: w.teks } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const nilai = horizontal ? ctx.parsed.x : ctx.parsed.y;
            return `${ctx.dataset.label}: ${formatAngka.format(nilai)}`;
          },
        },
      },
    },
    scales: horizontal ? { x: skalaAngka, y: skalaKategori } : { x: skalaKategori, y: skalaAngka },
  };
}

// Tabel: filter pencarian, urutkan, lalu tampilkan
function renderTabel() {
  el.subTabel.textContent = "Tahun " + status.tahunDipilih;

  // 1) Filter berdasarkan kata kunci
  const kata = status.kataCari.trim().toLowerCase();
  let baris = ambilBaris(status.tahunDipilih).filter((b) =>
    b.kecamatan.toLowerCase().includes(kata)
  );

  // 2) Urutkan berdasarkan kolom aktif
  const { kolom, arah } = status.urutan;
  baris.sort((a, b) => {
    const hasil = kolom === "kecamatan"
      ? a.kecamatan.localeCompare(b.kecamatan, "id")
      : a[kolom] - b[kolom];
    return arah === "asc" ? hasil : -hasil;
  });

  // 3) Tampilkan baris
  if (baris.length === 0) {
    el.tabelBody.innerHTML = `<tr><td colspan="4" class="kosong">Kecamatan tidak ditemukan.</td></tr>`;
    el.tabelFoot.innerHTML = "";
  } else {
    el.tabelBody.innerHTML = baris.map((b) => `
      <tr>
        <td>${b.kecamatan}</td>
        <td class="angka">${formatAngka.format(b.kelahiran)}</td>
        <td class="angka">${formatAngka.format(b.kematian)}</td>
        <td class="angka ${b.selisih >= 0 ? "positif" : "negatif"}">${formatSelisih(b.selisih)}</td>
      </tr>`).join("");

    // Baris total (mengikuti hasil pencarian)
    const total = jumlahkan(baris);
    el.tabelFoot.innerHTML = `
      <tr>
        <td>Total</td>
        <td class="angka">${formatAngka.format(total.lahir)}</td>
        <td class="angka">${formatAngka.format(total.mati)}</td>
        <td class="angka">${formatSelisih(total.selisih)}</td>
      </tr>`;
  }

  // 4) Perbarui panah pengurutan pada judul kolom
  el.tabelHead.forEach((th) => {
    th.setAttribute(
      "aria-sort",
      th.dataset.kolom === kolom ? (arah === "asc" ? "ascending" : "descending") : "none"
    );
  });
}

function formatSelisih(n) {
  return (n > 0 ? "+" : "") + formatAngka.format(n);
}

// ---------- Tema terang/gelap ----------
function terapkanTema() {
  document.documentElement.setAttribute("data-tema", status.tema);
  const gelap = status.tema === "gelap";
  el.ikonTema.textContent = gelap ? "☀️" : "🌙";
  el.teksTema.textContent = gelap ? "Mode Terang" : "Mode Gelap";
}

// ---------- Event ----------
function pasangEvent() {
  // Ganti tahun: semua bagian ikut berubah
  el.pilihTahun.addEventListener("change", () => {
    status.tahunDipilih = el.pilihTahun.value;
    renderSemua();
  });

  // Pencarian kecamatan
  el.kotakCari.addEventListener("input", () => {
    status.kataCari = el.kotakCari.value;
    renderTabel();
  });

  // Klik judul kolom untuk mengurutkan (mendukung Enter pada keyboard)
  el.tabelHead.forEach((th) => {
    const urutkan = () => {
      const kolom = th.dataset.kolom;
      if (status.urutan.kolom === kolom) {
        status.urutan.arah = status.urutan.arah === "asc" ? "desc" : "asc";
      } else {
        status.urutan = { kolom, arah: kolom === "kecamatan" ? "asc" : "desc" };
      }
      renderTabel();
    };
    th.addEventListener("click", urutkan);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter") urutkan(); });
  });

  // Tombol ganti tema; grafik digambar ulang agar warnanya ikut berubah
  el.tombolTema.addEventListener("click", () => {
    status.tema = status.tema === "gelap" ? "terang" : "gelap";
    terapkanTema();
    renderGrafikTren();
    renderGrafikKecamatan();
  });
}

// ---------- Mulai ----------
muatData();