// Mock Data (Sample from User's CSV)
const MOCK_DATA = [
    {
        listing_id: "10613839",
        title_norm: "citizenM Rome Isola Tiberina",
        source_url: "https://www.booking.com/hotel/it/citizenm-rome-isola-tiberina.html",
        review_count: 1517,
        rating: 8.9,
        llm_summary: "Guests praised the hotel's location, staff, and modern facilities. Some mentioned the excellent breakfast and comfortable rooms. However, a few guests experienced issues with room temperature and accessibility.",
        llm_pros: "location|staff|modern facilities|excellent breakfast|comfortable rooms",
        llm_cons: "room temperature|accessibility|self check-in preference|one side of the bed inaccessible",
        llm_rating_0_10: 8.5
    },
    {
        listing_id: "238909",
        title_norm: "Ateneo Garden Palace",
        source_url: "https://www.booking.com/hotel/it/ateneo-garden-palace.html",
        review_count: 1561,
        rating: 8.1,
        llm_summary: "The Ateneo Garden Palace is a 4-star hotel with a relaxing garden and courtyard, offering free WiFi, a 24-hour bar, and air-conditioned accommodations. It's located near Rome's Termini Train Station.",
        llm_pros: "clean rooms, great location, delicious breakfast, friendly staff, relaxing garden, free WiFi",
        llm_cons: "no air conditioner in some rooms, limited room facilities, some guests experienced issues with TV and air conditioning",
        llm_rating_0_10: 8.0
    },
    {
        listing_id: "80769",
        title_norm: "Hotel Centro Cavour Roma",
        source_url: "https://www.booking.com/hotel/it/hoteladasroma.html",
        review_count: 2883,
        rating: 8.9,
        llm_summary: "Hotel Centro Cavour Roma is a great choice for travelers, offering a perfect location, friendly staff, and clean rooms. Guests praise the hotel's proximity to the Colosseum.",
        llm_pros: "great location|friendly staff|clean rooms|close to Colosseum|Roman Forum|Cavour Metro Station",
        llm_cons: "small bathroom|limited space|slow WiFi|no early check-in options",
        llm_rating_0_10: 8.5
    },
    {
        listing_id: "84507",
        title_norm: "Hotel Diocleziano",
        source_url: "https://www.booking.com/hotel/it/diocleziano.html",
        review_count: 3404,
        rating: 9.0,
        llm_summary: "Hotel Diocleziano is a conveniently located, elegant hotel near Termini Train Station with friendly staff, a great breakfast, and comfortable rooms.",
        llm_pros: "friendly staff, great breakfast, convenient location, comfortable rooms, quiet, close to public transportation",
        llm_cons: "limited restaurant options in the vicinity, rooms may feel small for two people with large suitcases",
        llm_rating_0_10: 9.5
    },
    {
        listing_id: "23825",
        title_norm: "9Hotel Cesari",
        source_url: "https://www.booking.com/hotel/it/albergo-cesari.html",
        review_count: 1544,
        rating: 8.6,
        llm_summary: "9Hotel Cesari is a non-smoking hotel in Rome's historical center with a rooftop terrace and elegant rooms. It offers free WiFi, air conditioning, and a flat-screen TV.",
        llm_pros: "Perfect location, friendly and efficient staff, great rooftop, beautifully decorated clean rooms",
        llm_cons: "Extremely loud at night, garbage trucks & trucks that wash the streets come every night, poor breakfast",
        llm_rating_0_10: 8.0
    }
];

// Placeholder Images (since CSV doesn't have images)
const PLACEHOLDER_IMAGES = [
    "https://cf.bstatic.com/xdata/images/hotel/square600/295599026.webp?k=5c3e61793745672070c99738f6b9e248234380536762aa219198652392765275&o=",
    "https://cf.bstatic.com/xdata/images/hotel/square600/162002517.webp?k=5669b32cb6f19036c1dc798d601d5113d6a695c5d013915f01358d741c8f4989&o=",
    "https://cf.bstatic.com/xdata/images/hotel/square600/69490204.webp?k=c694a4601174983057d605256eab75df2a926a798b31a5c683b5387440b6167c&o=",
    "https://cf.bstatic.com/xdata/images/hotel/square600/356956247.webp?k=864459b3524a806c95c807b53a3e68058225e5af828f411655079a407335ce82&o=",
    "https://cf.bstatic.com/xdata/images/hotel/square600/171286994.webp?k=4296ce3de749b5ae7d6046e727582aa51523c06283dbce07d4b4a6217646536b&o="
];

// App State
let hotels = MOCK_DATA;

// DOM Elements
const hotelListEl = document.getElementById('hotel-list');
const propertyCountEl = document.getElementById('property-count');
const csvFileInput = document.getElementById('csvFileInput');

// Smart Parser for Lists (Handles ['a','b'], "a, b", "a|b")
function parseList(str) {
    if (!str) return [];

    str = str.toString().trim();
    if (str.length === 0) return [];

    // 1. JSON-like array: "['a', 'b']"
    if ((str.startsWith("['") || str.startsWith("[\"")) && str.endsWith("]")) {
        try {
            // Basic strict parsing often fails on simple single quotes, so manual cleanup is safer
            return str.slice(2, -2).split(/', '|", "/).map(s => s.replace(/['"]/g, "").trim());
        } catch (e) {
            return [str];
        }
    }

    // 2. Pipe separated: "Location|Staff|Breakfast"
    if (str.includes('|')) {
        return str.split('|').map(s => s.trim()).filter(s => s.length > 0);
    }

    // 3. Comma separated: "Location, Staff, Breakfast"
    // Use a heuristic: if it has commas and NO pipes
    if (str.includes(',')) {
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    // Default
    return [str];
}

// Render Header
function renderHotels(data) {
    hotelListEl.innerHTML = '';
    propertyCountEl.textContent = data.length.toLocaleString();

    data.forEach((hotel, index) => {
        // Robust parsing of pros/cons
        const pros = parseList(hotel.llm_pros).slice(0, 3);
        const cons = parseList(hotel.llm_cons).slice(0, 3);

        // Random price generation for demo
        const price = Math.floor(Math.random() * (400 - 100) + 100) * 3;

        // Image assignment (cycle through placeholders since CSV has no image)
        const imgSrc = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

        const card = document.createElement('div');
        card.className = 'hotel-card';
        card.id = `hotel-${hotel.listing_id}`;

        card.innerHTML = `
            <div class="hotel-info">
                <div class="hotel-header">
                    <a href="${hotel.source_url}" class="hotel-title" target="_blank">${hotel.title_norm}</a>
                    <div class="hotel-rating-box">
                        <div class="review-text">
                            <span class="review-score-desc">${getRatingDesc(hotel.rating)}</span>
                            <span class="review-count">${hotel.review_count ? Number(hotel.review_count).toLocaleString() : 0} reviews</span>
                        </div>
                        <div class="rating-badge">${hotel.rating || '-'}</div>
                    </div>
                </div>
                
                <div class="hotel-location">
                    <a href="#">Center, Rome</a> <span>•</span> <a href="#">Show on map</a>
                    <span>• Close to attractions</span>
                </div>

                <div class="hotel-card-body">
                    <div class="hotel-details">
                        <div class="room-desc">Superior Double Room</div>
                        <div class="room-features">1 full bed • Free cancellation • No prepayment needed</div>
                        <p style="color:#666; font-size:12px; margin-top:8px;">${hotel.llm_summary ? hotel.llm_summary.substring(0, 150) + '...' : 'No summary available.'}</p>
                        
                        <!-- AI Summary Trigger -->
                        <div class="ai-badge" onclick="toggleTooltip('${hotel.listing_id}', event)">
                            <i class="fa-solid fa-robot ai-robot-icon"></i> Summary of Reviews
                        </div>
                    </div>
                    
                    <div class="hotel-price-section">
                        <span class="price-days">3 nights, 2 adults</span>
                        <span class="price-value">ILS ${price.toLocaleString()}</span>
                        <span class="price-taxes">+ILS ${Math.floor(price * 0.1)} taxes and charges</span>
                        <button class="btn-availability">
                            See availability <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tooltip HTML -->
            <div class="review-tooltip" id="tooltip-${hotel.listing_id}">
                <div class="tooltip-header">
                    <div class="tooltip-title"><i class="fa-solid fa-robot"></i> Summary of Reviews</div>
                    <div class="close-tooltip" onclick="closeTooltip('${hotel.listing_id}', event)"><i class="fa-solid fa-xmark"></i></div>
                </div>
                <div class="tooltip-content">
                    <div class="tooltip-section">
                        <h5><i class="fa-regular fa-circle-check pros-title"></i> Pros:</h5>
                        <ul class="tooltip-list">
                            ${pros.length ? pros.map(p => `<li><i class="fa-solid fa-check list-check"></i> ${p}</li>`).join('') : '<li style="color:#999; font-style:italic;">No pros listed</li>'}
                        </ul>
                    </div>
                    <div class="tooltip-section">
                        <h5><i class="fa-regular fa-circle-xmark cons-title"></i> Cons:</h5>
                        <ul class="tooltip-list">
                            ${cons.length ? cons.map(c => `<li><i class="fa-solid fa-xmark list-cross"></i> ${c}</li>`).join('') : '<li style="color:#999; font-style:italic;">No cons listed</li>'}
                        </ul>
                    </div>
                </div>
                <div class="tooltip-footer">
                    <span>Overall Rating:</span>
                    <span class="rating-val">${hotel.llm_rating_0_10 || '-'}/10</span>
                </div>
            </div>
        `;
        hotelListEl.appendChild(card);
    });
}

function getRatingDesc(rating) {
    if (!rating) return "";
    const r = parseFloat(rating);
    if (r >= 9.5) return "Exceptional";
    if (r >= 9.0) return "Wonderful";
    if (r >= 8.5) return "Excellent";
    if (r >= 8.0) return "Very Good";
    return "Good";
}

// Global Tooltip Handlers
window.toggleTooltip = function (id, e) {
    e.stopPropagation();
    const tooltip = document.getElementById(`tooltip-${id}`);

    // Close others
    document.querySelectorAll('.review-tooltip.show').forEach(el => {
        if (el.id !== `tooltip-${id}`) el.classList.remove('show');
    });

    tooltip.classList.toggle('show');
};

window.closeTooltip = function (id, e) {
    e.stopPropagation();
    document.getElementById(`tooltip-${id}`).classList.remove('show');
};

// Close when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.review-tooltip') && !e.target.closest('.ai-badge')) {
        document.querySelectorAll('.review-tooltip.show').forEach(el => el.classList.remove('show'));
    }
});

// CSV Handling
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                console.log("Parsed CSV:", results.data);
                if (results.data && results.data.length > 0) {
                    hotels = results.data;
                    renderHotels(hotels);
                    alert(`Loaded ${hotels.length} hotels from CSV!`);
                }
            },
            error: function (err) {
                alert("Error parsing CSV: " + err.message);
            }
        });
    }
});

// Initial Render
renderHotels(hotels);
