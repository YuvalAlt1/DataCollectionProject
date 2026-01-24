// App State
let hotels = [];

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
            console.warn("Failed to parse JSON list:", str);
            return [str];
        }
    }

    // 2. Pipe separated: "Location|Staff|Breakfast"
    if (str.includes('|')) {
        return str.split('|').map(s => s.trim()).filter(s => s.length > 0);
    }

    // 3. Comma separated: "Location, Staff, Breakfast"
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

        // Random price generation for demo (since CSV doesn't have it)
        const price = Math.floor(Math.random() * (400 - 100) + 100) * 3;

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

// CSV Handling & Initialization
function init() {
    // Check if CSV_DATA (from data.js) is available
    if (typeof CSV_DATA !== 'undefined' && CSV_DATA) {
        console.log("Found pre-loaded CSV data!");
        Papa.parse(CSV_DATA, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                console.log("Parsed pre-loaded CSV:", results.data);
                if (results.data && results.data.length > 0) {
                    hotels = results.data;
                    renderHotels(hotels);
                }
            },
            error: function (err) {
                console.error("Error parsing pre-loaded CSV:", err);
                // Fallback or empty state
            }
        });
    } else {
        console.log("No pre-loaded data found. Waiting for user upload.");
    }
}

csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
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

// Start
init();
