// Konfigurasi Global URL Backend
// Secara otomatis mendeteksi apakah berjalan di localhost atau production
const hostname = window.location.hostname;

window.API_BASE_URL = (hostname === "localhost" || hostname === "127.0.0.1") 
    ? "http://localhost:3000" 
    : ""; // Production: gunakan path relatif agar API ikut domain yang sama (toko.alvezadigital.com)
