// // main.js - loads data/places.json and renders content on taluk pages.
// // Expects the taluk page to have a section with id="places" and attribute data-taluk="slug"

// (async function () {
//   const section = document.getElementById("places");
//   if (!section) return; // nothing to do on non-taluk pages

//   const taluk = section.getAttribute("data-taluk") || section.dataset.taluk;
//   if (!taluk) {
//     section.innerHTML = '<p class="small">No taluk specified.</p>';
//     return;
//   }

//   section.innerHTML =
//     '<div class="container"><h2>Tourist places in ' +
//     capitalize(taluk) +
//     '</h2><div id="places-list" class="places-grid"><p class="small">Loading...</p></div></div>';

//   let data = {};
//   try {
//     const res = await fetch("../data/places.json");
//     if (!res.ok) {
//       throw new Error("Failed to fetch places.json");
//     }
//     data = await res.json();
//   } catch (err) {
//     console.error(err);
//     const el = document.getElementById("places-list");
//     if (el) el.innerHTML = '<p class="small">Could not load places data.</p>';
//     return;
//   }

//   const places = data[taluk] || [];
//   const container = document.getElementById("places-list");
//   if (!container) return;

//   if (places.length === 0) {
//     container.innerHTML =
//       '<p class="small">No places found for this taluk yet. You can edit <code>/data/places.json</code> to add entries.</p>';
//     renderMap(section, taluk, null);
//     return;
//   }

//   container.innerHTML = "";
//   for (const p of places) {
//     const card = document.createElement("article");
//     card.className = "place-card";

//     const imgSrc = p.image ? p.image : "../data/images.json";
//     const img = document.createElement("img");
//     img.src = imgSrc.startsWith("http") ? imgSrc : normalizePath(imgSrc);
//     img.alt = p.name || "place photo";

//     const meta = document.createElement("div");
//     meta.className = "place-meta";

//     const title = document.createElement("h3");
//     title.textContent = p.name || "Unknown";

//     const rating = document.createElement("div");
//     rating.className = "meta-line";
//     rating.textContent =
//       (p.rating ? "⭐ " + p.rating + " • " : "") + (p.type || "");

//     const desc = document.createElement("p");
//     desc.textContent = p.description || "";

//     const actions = document.createElement("div");
//     actions.className = "place-actions";

//     const viewBtn = document.createElement("a");
//     viewBtn.className = "btn";
//     viewBtn.textContent = "View on Maps";
//     viewBtn.target = "_blank";
//     viewBtn.rel = "noopener noreferrer";
//     viewBtn.href = p.maps_url || getMapsSearchUrl(p);

//     const dirBtn = document.createElement("a");
//     dirBtn.className = "btn";
//     dirBtn.textContent = "Get directions";
//     dirBtn.target = "_blank";
//     dirBtn.rel = "noopener noreferrer";
//     dirBtn.href = getDirectionsUrl(p);

//     actions.appendChild(viewBtn);
//     // actions.appendChild(dirBtn);

//     meta.appendChild(title);
//     meta.appendChild(rating);
//     meta.appendChild(desc);
//     meta.appendChild(actions);

//     card.appendChild(img);
//     card.appendChild(meta);
//     container.appendChild(card);
//   }

//   // Render a small map centered around the first place (if lat/lng found)
//   const firstWithCoord = places.find((pl) => pl.lat && pl.lng);
//   renderMap(section, taluk, firstWithCoord);

//   /* helpers */

//   function getMapsSearchUrl(place) {
//     if (place.maps_url) return place.maps_url;
//     if (place.lat && place.lng)
//       return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
//     return "https://www.google.com/maps";
//   }

//   function getDirectionsUrl(place) {
//     if (place.lat && place.lng) {
//       return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
//     }
//     if (place.maps_url) return place.maps_url;
//     return "https://www.google.com/maps";
//   }

//   function normalizePath(path) {
//     // If a path starts with assets/... or ../assets/... fix it to relative from current taluk page
//     if (path.startsWith("assets/")) return "../" + path;
//     return path;
//   }

//   function renderMap(sectionEl, talukName, place) {
//     // Add a small map iframe. Uses Google Maps Embed API format.
//     // NOTE: To use Maps Embed API with center parameter you may want to add your API key: &key=YOUR_KEY
//     const mapWrap = document.createElement("div");
//     mapWrap.className = "map-box";
//     let src = "";
//     if (place && place.lat && place.lng) {
//       src = `https://www.google.com/maps/embed/v1/view?zoom=11&center=${place.lat},${place.lng}`;
//     } else {
//       // fallback center to the taluk (no precise coords) - use district approximate center
//       src =
//         "https://www.google.com/maps/embed/v1/place?q=Uttara+Kannada+Karnataka";
//     }
//     // If you have an API key you can append &key=YOUR_API_KEY to the src above.
//     const iframe = document.createElement("iframe");
//     iframe.className = "map-embed";
//     iframe.loading = "lazy";
//     iframe.referrerPolicy = "no-referrer-when-downgrade";
//     iframe.src = src;
//     iframe.title =
//       place && place.name ? place.name + " map" : talukName + " map";

//     mapWrap.appendChild(iframe);
//     sectionEl.appendChild(mapWrap);

//     const note = document.createElement("p");
//     note.className = "small";
//     note.innerHTML =
//       "Tip: For higher-quality embeds replace the map src with an Embed API URL and add your API key.";
//     sectionEl.appendChild(note);
//   }

//   function capitalize(s) {
//     if (!s) return "";
//     return s[0].toUpperCase() + s.slice(1);
//   }
// })();



// // Fetch JSON data
// Promise.all([
//     fetch('data/places.json').then(res => res.json()),
//     fetch('data/images.json').then(res => res.json())
//   ]).then(([placesData, imagesData]) => {
//     const container = document.getElementById('places-container');
  
//     // Loop through taluks
//     Object.keys(placesData).forEach(taluk => {
//       placesData[taluk].forEach(place => {
//         const card = document.createElement('div');
//         card.className = "bg-white rounded-xl shadow-lg overflow-hidden card-hover";
//         card.innerHTML = `
//           <img src="${imagesData[place.image]}" alt="${place.name}" class="w-full h-48 object-cover">
//           <div class="p-4">
//             <h2 class="text-xl font-bold mb-2">${place.name}</h2>
//             <p class="text-gray-600 mb-2">${place.type}</p>
//             <p class="text-yellow-500 font-semibold">Rating: ${place.rating} ⭐</p>
//             <p class="text-gray-700 mt-2 text-sm">${place.description}</p>
//             <a href="${place.maps_url}" target="_blank" class="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Get Directions</a>
//           </div>
//         `;
//         container.appendChild(card);
//       });
//     });
//   });
  


Promise.all([
  fetch('data/places.json').then(res => res.json()),
  fetch('data/images.json').then(res => res.json())
]).then(([placesData, imagesData]) => {
  const container = document.getElementById('places-container');

  Object.keys(placesData).forEach(taluk => {
    placesData[taluk].forEach(place => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-xl shadow-lg overflow-hidden card-hover";
      card.innerHTML = `
        <img src="${imagesData[place.image]}" alt="${place.name}" class="w-full h-48 object-cover">
        <div class="p-4">
          <h2 class="text-xl font-bold mb-2">${place.name}</h2>
          <p class="text-gray-600 mb-2">${place.type}</p>
          <p class="text-yellow-500 font-semibold mb-2">Rating: ${place.rating} ⭐</p>
          <p class="text-gray-700 mb-3 text-sm">${place.description}</p>
          <a href="taluk.html?name=${taluk}" class="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">View Taluk</a>
        </div>
      `;
      container.appendChild(card);
    });
  });
});
