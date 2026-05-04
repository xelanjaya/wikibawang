// app.js

const WikiBawang = (function() {
    // ==========================================
    // 1. PRIVATE VARIABLES (Aman dari polusi)
    // ==========================================
    const app = document.getElementById('app');
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const searchInput = document.getElementById('searchInput');
    const suggestionBox = document.getElementById('suggestionBox');
    const searchIndicator = document.getElementById('searchIndicator');

    let currentPage = 1;
    let currentQuery = "";
    let currentMode = "top"; 
    let debounceTimer;
    let currentAnimeData = null; 

    // ==========================================
    // 2. PRIVATE FUNCTIONS (Hanya bisa diakses dari dalam)
    // ==========================================
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureGridContainer(title, highlightText) {
        app.innerHTML = `
            <div class="mb-12 flex items-center gap-4">
                <div class="h-10 w-2 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">${title} <span class="text-blue-500">${highlightText}</span></h2>
            </div>
            <div id="anime-container" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8"></div>
        `;
    }

    function renderSuggestions(animes) {
        if (animes.length === 0) { suggestionBox.classList.add('hidden'); return; }
        // Perhatikan pemanggilan WikiBawang.executeSearch di bawah ini
        suggestionBox.innerHTML = animes.map(anime => `
            <div onclick="WikiBawang.executeSearch('${escapeHTML(anime.title)}', true)" class="flex items-center gap-4 p-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-none transition-all">
                <img src="${anime.images.webp.small_image_url}" alt="Poster ${escapeHTML(anime.title)}" class="w-12 h-16 object-cover rounded-xl shadow-lg">
                <div>
                    <p class="text-sm font-bold text-white truncate w-48 md:w-64">${escapeHTML(anime.title)}</p>
                    <p class="text-[10px] text-blue-400 font-bold uppercase tracking-wider">${escapeHTML(anime.type)} • ⭐ ${anime.score || 'N/A'}</p>
                </div>
            </div>`).join('');
        suggestionBox.classList.remove('hidden');
    }

    function renderGrid(animes) {
        const container = document.getElementById('anime-container');
        if (!container) return; 
        if (animes.length === 0) { container.innerHTML = `<p class="col-span-full text-center py-24 text-slate-500 font-bold italic">No titles found.</p>`; pagination.classList.add('hidden'); return; }
        pagination.classList.remove('hidden');
        // Perhatikan pemanggilan WikiBawang.showDetail di bawah ini
        container.innerHTML = animes.map(anime => `
            <div onclick="WikiBawang.showDetail(${anime.mal_id}, true)" class="anime-card group bg-slate-800/40 rounded-3xl overflow-hidden border border-white/5 transition-all duration-500 cursor-pointer fade-in">
                <div class="relative aspect-[3/4.2] overflow-hidden">
                    <div class="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-white z-10 shadow-xl">⭐ ${anime.score || 'N/A'}</div>
                    <img src="${anime.images.webp.large_image_url}" alt="Poster ${escapeHTML(anime.title)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-sm truncate group-hover:text-blue-400 transition-colors mb-1 text-slate-200">${escapeHTML(anime.title)}</h3>
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${escapeHTML(anime.type) || 'TV'} • ${anime.year || 'N/A'}</p>
                </div>
            </div>`).join('');
    }

    function errorMsg() { 
        app.innerHTML = `<div class="text-center py-32"><p class="text-red-500 font-black text-xl uppercase tracking-widest">Network Outage. Please Reload.</p></div>`; 
    }

    async function fetchData() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const container = document.getElementById('anime-container');
        if(container) container.innerHTML = `<div class="col-span-full flex justify-center py-24"><div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>`;
        const url = currentMode === "top" ? `https://api.jikan.moe/v4/top/anime?page=${currentPage}&limit=12` : `https://api.jikan.moe/v4/anime?q=${currentQuery}&page=${currentPage}&limit=12&sfw=true`;
        try {
            const res = await fetch(url);
            const { data, pagination: apiPagination } = await res.json();
            renderGrid(data);
            pageInfo.innerText = `PAGE ${currentPage}`;
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = !apiPagination.has_next_page;
        } catch (e) { errorMsg(); }
    }

    // ==========================================
    // 3. PUBLIC FUNCTIONS (Metode yang bisa dipanggil HTML)
    // ==========================================
    function resetAndHome() {
        currentPage = 1; currentQuery = ""; currentMode = "top";
        searchInput.value = ""; suggestionBox.classList.add('hidden');
        showHome(true); 
    }

    function showHome(updateUrl = false) {
        currentMode = "top"; pagination.classList.remove('hidden');
        if (updateUrl) history.pushState({ view: 'home' }, '', window.location.pathname);
        ensureGridContainer('Trending', 'Now');
        fetchData();
    }

    function executeSearch(query, updateUrl = true) {
        searchInput.value = query; suggestionBox.classList.add('hidden');
        currentQuery = query; currentMode = "search"; currentPage = 1; 
        if (updateUrl) history.pushState({ view: 'search', q: query }, '', `?q=${encodeURIComponent(query)}`);
        ensureGridContainer('Search', 'Results');
        fetchData();
    }

    async function showDetail(id, updateUrl = true) {
        pagination.classList.add('hidden'); suggestionBox.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (updateUrl) history.pushState({ view: 'detail', id: id }, '', `?id=${id}`);

        app.innerHTML = `<div class="flex justify-center py-32"><div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>`;
        
        try {
            const [infoRes, charRes] = await Promise.all([
                fetch(`https://api.jikan.moe/v4/anime/${id}/full`),
                fetch(`https://api.jikan.moe/v4/anime/${id}/characters`)
            ]);
            const info = await infoRes.json(); const char = await charRes.json();
            const data = info.data; const characters = char.data.slice(0, 8);
            
            currentAnimeData = data; 
            const favs = JSON.parse(localStorage.getItem('wiki_favs')) || [];
            const isFav = favs.some(item => item.mal_id == data.mal_id);

            app.innerHTML = `
                <div class="max-w-6xl mx-auto fade-in pb-20">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                        <button onclick="window.history.back()" class="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-3 group">
                            <span class="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-all">←</span> Back
                        </button>
                        <button onclick="WikiBawang.handleToggleFav()" 
                            class="w-full md:w-auto px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${isFav ? 'bg-pink-600 text-white shadow-pink-500/20' : 'glass text-slate-300 hover:bg-pink-600 hover:text-white'}">
                            ${isFav ? '❤️ Remove' : '🤍 Save to Favorites'}
                        </button>
                    </div>

                    <div class="glass rounded-[40px] overflow-hidden flex flex-col lg:flex-row mb-16 shadow-2xl">
                        <div class="w-full lg:w-[450px] shrink-0 relative group">
                            <img src="${data.images.webp.large_image_url}" alt="Poster ${escapeHTML(data.title)}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                        </div>
                        <div class="p-8 md:p-14 flex-1">
                            <h1 class="text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tighter leading-tight">${escapeHTML(data.title)}</h1>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                <div class="glass p-5 rounded-3xl text-center"><span class="block text-[10px] text-slate-500 font-black uppercase mb-2">Studio</span><p class="text-xs font-bold text-blue-400 truncate">${escapeHTML(data.studios[0]?.name || 'N/A')}</p></div>
                                <div class="glass p-5 rounded-3xl text-center"><span class="block text-[10px] text-slate-500 font-black uppercase mb-2">Rating</span><p class="text-xs font-bold text-slate-200">${data.score || 'N/A'}</p></div>
                                <div class="glass p-5 rounded-3xl text-center"><span class="block text-[10px] text-slate-500 font-black uppercase mb-2">Episodes</span><p class="text-xs font-bold text-slate-200">${data.episodes || '?'}</p></div>
                                <div class="glass p-5 rounded-3xl text-center"><span class="block text-[10px] text-slate-500 font-black uppercase mb-2">Status</span><p class="text-xs font-bold text-slate-200">${escapeHTML(data.status)}</p></div>
                            </div>
                            <h3 class="text-xl font-extrabold mb-4 text-blue-500 uppercase tracking-tighter italic">Synopsis</h3>
                            <p class="text-slate-400 text-sm md:text-base leading-relaxed mb-12 text-justify">${escapeHTML(data.synopsis || 'N/A')}</p>
                            ${data.trailer.youtube_id ? `
                                <div class="aspect-video rounded-[32px] overflow-hidden shadow-2xl border border-white/5 ring-8 ring-slate-900/50">
                                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${data.trailer.youtube_id}" title="Trailer ${escapeHTML(data.title)}" frameborder="0" allowfullscreen></iframe>
                                </div>` : ''}
                        </div>
                    </div>

                    <div>
                        <div class="mb-10 flex items-center gap-4">
                            <div class="h-8 w-2 bg-gradient-to-b from-yellow-400 to-orange-600 rounded-full"></div>
                            <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Cast & <span class="text-yellow-500">Crew</span></h2>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            ${characters.map(c => {
                                const seiyuu = c.voice_actors.find(v => v.language === 'Japanese');
                                return `
                                    <div class="glass rounded-[32px] p-8 border border-white/5 flex flex-col gap-6 hover:border-yellow-500/20 transition-all group">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-5">
                                                <img src="${c.character.images.webp.image_url}" alt="Karakter ${escapeHTML(c.character.name)}" class="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-900 group-hover:ring-blue-500/50 transition-all shadow-2xl">
                                                <div>
                                                    <p class="text-lg font-extrabold text-white mb-1">${escapeHTML(c.character.name)}</p>
                                                    <p class="text-[10px] text-blue-500 font-black uppercase tracking-widest">${escapeHTML(c.role)} Hero</p>
                                                </div>
                                            </div>
                                            ${seiyuu ? `<img src="${seiyuu.person.images.jpg.image_url}" alt="Seiyuu ${escapeHTML(seiyuu.person.name)}" class="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-900 group-hover:ring-yellow-500/50 transition-all shadow-2xl">` : ''}
                                        </div>
                                        <div class="bg-slate-950/50 p-5 rounded-2xl border border-white/5">
                                            <p class="text-xs text-slate-400 leading-relaxed italic">
                                                <strong>Bio:</strong> A prominent <span class="text-blue-400 font-bold">${escapeHTML(c.role)}</span> figure. 
                                                ${seiyuu ? `Voice perfectly rendered by Japanese legend <strong class="text-yellow-500">${escapeHTML(seiyuu.person.name)}</strong>.` : 'Voice talent info TBD.'}
                                            </p>
                                        </div>
                                    </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>`;
        } catch (e) { errorMsg(); }
    }

    function showFavorites(updateUrl = true) { 
        pagination.classList.add('hidden'); 
        if (updateUrl) history.pushState({ view: 'favorites' }, '', '?fav=true');
        
        app.innerHTML = `
            <div class="mb-12 flex items-center gap-4">
                <div class="h-10 w-2 bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
                <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Your <span class="text-pink-500">Collection</span></h2>
            </div>
            <div id="anime-container" class="grid grid-cols-2 md:grid-cols-6 gap-6"></div>
        `; 
        renderGrid(JSON.parse(localStorage.getItem('wiki_favs')) || []); 
    }

    function changePage(d) { currentPage += d; fetchData(); }
    
    function fetchRandomAnime() { 
        fetch('https://api.jikan.moe/v4/random/anime')
            .then(r => r.json())
            .then(r => showDetail(r.data.mal_id, true)); 
    }

    function handleToggleFav() { 
        if (!currentAnimeData) return; 
        let f = JSON.parse(localStorage.getItem('wiki_favs')) || []; 
        const i = f.findIndex(x => x.mal_id === currentAnimeData.mal_id); 
        if (i > -1) { f.splice(i, 1); } else { f.push(currentAnimeData); }
        localStorage.setItem('wiki_favs', JSON.stringify(f)); 
        showDetail(currentAnimeData.mal_id, false); 
    }

    // ==========================================
    // 4. INISIALISASI & EVENT LISTENERS
    // ==========================================
    function handleRouting() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const q = params.get('q');
        const fav = params.get('fav');

        if (id) showDetail(id, false);
        else if (fav) showFavorites(false);
        else if (q) executeSearch(q, false);
        else showHome(false);
    }

    function init() {
        // Event listener untuk search bar
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(debounceTimer);
            if (query.length < 1) { suggestionBox.classList.add('hidden'); if (currentMode === "search") resetAndHome(); return; }
            searchIndicator.classList.remove('hidden');
            debounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=5&sfw=true`);
                    const { data } = await res.json();
                    renderSuggestions(data);
                } catch (e) { console.error(e); }
                searchIndicator.classList.add('hidden');
            }, 400);
        });

        // Event listener global
        window.addEventListener('popstate', handleRouting);
        document.addEventListener('click', (e) => { 
            if (!e.target.closest('#searchInput') && !e.target.closest('#suggestionBox')) {
                suggestionBox.classList.add('hidden'); 
            }
        });

        handleRouting();
    }

    // ==========================================
    // 5. EXPORT PUBLIC API (Celah Brankas)
    // ==========================================
    // Hanya fungsi-fungsi di bawah ini yang bisa dipanggil oleh file HTML
    return {
        init,
        resetAndHome,
        showFavorites,
        fetchRandomAnime,
        changePage,
        showDetail,
        executeSearch,
        handleToggleFav
    };

})(); // Kurung kurawal ganda ini langsung mengeksekusi (membungkus) fungsinya!

// Nyalakan aplikasi saat file JS dimuat
WikiBawang.init();
