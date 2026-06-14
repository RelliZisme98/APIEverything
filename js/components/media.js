import APP_CONFIG from '../../config.js';

/* ── Movies & Games Component ── */

const CURATED_MOVIES = [
  {
    title: "Captain America: Thế Giới Mới",
    overview: "Sau khi gặp Tổng thống Hoa Kỳ mới đắc cử Thaddeus Ross, Sam Wilson thấy mình bị cuốn vào một sự cố quốc tế. Anh phải khám phá lý do đằng sau một âm mưu cực kì nguy hiểm trước khi kẻ chủ mưu thật sự khiến cả thế giới phải hoảng sợ.",
    poster_path: "/fWTZk4Y7HTyTTGNJnXNaX3XTE0v.jpg",
    vote_average: 7.6,
    release_date: "2025-02-14",
    trailer_id: "1pHDWnXmK7Y"
  },
  {
    title: "Một bộ phim Minecraft",
    overview: "Bốn kẻ lạc lõng bất ngờ bị kéo qua cánh cửa dẫn đến Overworld: một thế giới kỳ lạ từ những khối lập phương. Để trở về nhà, họ cần phải làm chủ thế giới này dưới sự giúp đỡ của thợ chế tạo huyền thoại Steve.",
    poster_path: "/wRrGBv4uNofBVyShxfS0iugbcm8.jpg",
    vote_average: 7.2,
    release_date: "2025-04-04",
    trailer_id: "wJO_vIDZn-I"
  },
  {
    title: "Nhiệm Vụ: Bất Khả Thi - Nghiệp Báo Cuối Cùng",
    overview: "Sau khi thoát khỏi vụ tai nạn tàu hỏa thảm khốc, Ethan Hunt nhận ra thực thể nhân tạo The Entity đang được giấu bên trong một chiếc tàu ngầm cũ của Nga, đồng thời đối mặt với cuộc săn đuổi của kẻ thù trong quá khứ.",
    poster_path: "/wxnbCpRKs8FV1SLZYA0mj1x26f9.jpg",
    vote_average: 8.6,
    release_date: "2025-05-30",
    trailer_id: "fsQgc9pCyDU"
  },
  {
    title: "Superman",
    overview: "Superman cố gắng can thiệp vào một cuộc khủng hoảng toàn cầu do Lex Luthor gây ra, nhưng lại bị công chúng hiểu lầm. Anh buộc phải đối mặt với bản ngã đen tối Ultraman để giành lại niềm tin từ nhân loại.",
    poster_path: "/f4hJ5yVSiOSnW9S6vtoGlNYvW5J.jpg",
    vote_average: 8.8,
    release_date: "2025-07-10",
    trailer_id: "3ztJynZvxa4"
  },
  {
    title: "Phi Vụ Động Trời 2 (Zootopia 2)",
    overview: "Bộ đôi cảnh sát nổi tiếng Judy Hopps và Nick Wilde tái xuất trong một vụ án mới đầy thách thức tại thành phố động vật Zootopia, mở ra những bí ẩn ly kỳ và những tiếng cười sảng khoái.",
    poster_path: "/5wXpOF9WPUKliIzNBdAqwAStLHU.jpg",
    vote_average: 8.4,
    release_date: "2025-11-28",
    trailer_id: "BjkIOU5PhyQ"
  },
  {
    title: "Avatar: Lửa và Tro Tàn",
    overview: "Gia đình Jake Sully và Neytiri phải đối mặt với tộc Tro Tàn — một nhóm Na'vi hung bạo và khát khao quyền lực do thủ lĩnh tàn nhẫn Varang dẫn dắt, đẩy cuộc xung đột sinh tồn đến giới hạn cuối cùng.",
    poster_path: "/w6DBmG260sCHBQdGzkBIVn9gAQZ.jpg",
    vote_average: 8.5,
    release_date: "2025-12-19",
    trailer_id: "nb_fFj_0rq8"
  }
];

const CURATED_GAMES = [
  {
    title: "Monster Hunter Wilds",
    overview: "Siêu phẩm hành động nhập vai săn quái vật thế hệ mới của Capcom, mang đến thế giới hoang dã rộng lớn cùng cơ chế thời tiết biến đổi và chiến đấu kịch tính.",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400",
    rating: 9.3,
    platforms: ["pc", "ps5", "xbox"],
    publisher: "Capcom"
  },
  {
    title: "Grand Theft Auto VI",
    overview: "Siêu phẩm thế giới mở tiếp theo của Rockstar Games, đưa người chơi trở lại thành phố ngập tràn ánh đèn Vice City của bang Leonida với cốt truyện đầy hấp dẫn.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400",
    rating: 9.8,
    platforms: ["ps5", "xbox"],
    publisher: "Rockstar Games"
  },
  {
    title: "Ghost of Yōtei",
    overview: "Hậu bản của bom tấn Ghost of Tsushima, đưa người chơi đến năm 1603. Theo chân Atsushi trong hành trình báo thù đầy cô độc xung quanh chân núi Yōtei.",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=400",
    rating: 9.2,
    platforms: ["ps5"],
    publisher: "Sucker Punch Productions"
  },
  {
    title: "Death Stranding 2: On The Beach",
    overview: "Kiệt tác tiếp theo của nhà làm game huyền thoại Hideo Kojima, Sam Porter Bridges tiếp tục hành trình kết nối nhân loại bên ngoài ranh giới nước Mỹ.",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&q=80&w=400",
    rating: 9.0,
    platforms: ["ps5"],
    publisher: "Kojima Productions"
  },
  {
    title: "Doom: The Dark Ages",
    overview: "Phần tiền truyện kể về nguồn gốc cơn giận dữ của Doom Slayer. Lấy bối cảnh những trận chiến phong kiến tăm tối chống lại ác quỷ địa ngục.",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400",
    rating: 8.9,
    platforms: ["pc", "ps5", "xbox"],
    publisher: "id Software / Bethesda"
  },
  {
    title: "Civilization VII",
    overview: "Đỉnh cao mới của dòng game chiến thuật xây dựng đế chế 4X huyền thoại, dẫn dắt nền văn minh của bạn qua các thời kỳ lịch sử phát triển.",
    image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&q=80&w=400",
    rating: 9.1,
    platforms: ["pc", "ps5", "xbox", "nintendo"],
    publisher: "Firaxis Games / 2K"
  }
];

export function renderMedia() {
  const container = document.getElementById('mediaContent');
  if (!container) return;

  container.innerHTML = `
    <div class="media-wrap">
      <!-- Tabs -->
      <div class="lk-tabs">
        <button class="lk-tab-btn active" id="tabMediaMovies">🎬 Phim Chiếu Rạp</button>
        <button class="lk-tab-btn" id="tabMediaGames">🎮 Trò Chơi Hot</button>
      </div>

      <!-- Movies Section -->
      <div id="mediaMoviesContent" class="lk-pane active" style="border:none; padding:0; background:none;">
        <div class="media-grid" id="moviesGrid"></div>
      </div>

      <!-- Games Section -->
      <div id="mediaGamesContent" class="lk-pane" style="border:none; padding:0; background:none;">
        <div class="media-grid" id="gamesGrid"></div>
      </div>
    </div>
  `;

  // Bind tabs
  const tabMovies = document.getElementById('tabMediaMovies');
  const tabGames = document.getElementById('tabMediaGames');
  const paneMovies = document.getElementById('mediaMoviesContent');
  const paneGames = document.getElementById('mediaGamesContent');

  tabMovies.addEventListener('click', () => {
    tabMovies.classList.add('active');
    tabGames.classList.remove('active');
    paneMovies.classList.add('active');
    paneGames.classList.remove('active');
  });

  tabGames.addEventListener('click', () => {
    tabGames.classList.add('active');
    tabMovies.classList.remove('active');
    paneGames.classList.add('active');
    paneMovies.classList.remove('active');
  });

  // Render content
  renderMoviesList();
  renderGamesList();
  setupTrailerModal();
}

async function renderMoviesList() {
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
      <span class="status-dot dot-yellow"></span> Đang tải phim chiếu rạp thời gian thực...
    </div>
  `;

  let movies = [];
  try {
    const apiBase = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TRAFFIC_PROXY_URL) 
      ? APP_CONFIG.TRAFFIC_PROXY_URL.replace(/\/$/, '') 
      : '';
    const res = await fetch(`${apiBase}/api/movies-now-playing`);
    if (res.ok) {
      movies = await res.json();
    }
  } catch (err) {
    console.warn("Failed to fetch live movies:", err);
  }

  // Fallback to static if empty or failed
  if (!movies || movies.length === 0) {
    movies = CURATED_MOVIES;
  }

  grid.innerHTML = movies.map(movie => {
    const posterUrl = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400';

    return `
      <div class="media-card">
        <div class="media-poster-wrap">
          <img class="media-poster" src="${posterUrl}" alt="${movie.title}" loading="lazy" />
          <span class="media-rating-badge">★ ${(movie.vote_average || 7.5).toFixed(1)}</span>
        </div>
        <div class="media-body">
          <div>
            <div class="media-card-title">${movie.title}</div>
            <div class="media-meta-info" style="margin-top:2px;">Khởi chiếu: ${movie.release_date || 'Đang cập nhật'}</div>
            <div class="media-card-desc" style="margin-top:6px;">${movie.overview || 'Không có tóm tắt.'}</div>
          </div>
          <button class="btn-primary" style="padding: 6px 12px; font-size:11px; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="window.openTrailerModal('${movie.trailer_id || 'dQw4w9WgXcQ'}', '${movie.title.replace(/'/g, "\\'")}')">
            ▶ Xem Trailer
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderGamesList() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  grid.innerHTML = CURATED_GAMES.map(game => {
    const platformHTML = game.platforms.map(p => {
      let platClass = '';
      if (p === 'pc') platClass = 'game-platform--pc';
      else if (p === 'ps5') platClass = 'game-platform--ps';
      else if (p === 'xbox') platClass = 'game-platform--xbox';
      else if (p === 'nintendo') platClass = 'game-platform--nintendo';
      return `<span class="game-platform ${platClass}">${p}</span>`;
    }).join('');

    return `
      <div class="media-card">
        <div class="media-poster-wrap">
          <img class="media-poster" src="${game.image}" alt="${game.title}" loading="lazy" />
          <span class="media-rating-badge" style="border-color:rgba(96,165,250,0.5); color:#60a5fa;">★ ${game.rating.toFixed(1)}</span>
        </div>
        <div class="media-body">
          <div>
            <div class="media-card-title">${game.title}</div>
            <div class="game-platforms">${platformHTML}</div>
            <div class="media-card-desc" style="margin-top:8px;">${game.overview}</div>
          </div>
          <div class="media-meta-info" style="border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; margin-top:6px;">
            Nhà phát triển: <strong>${game.publisher}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupTrailerModal() {
  // Check if modal container already exists in body
  let modal = document.getElementById('trailerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.id = 'trailerModal';
    document.body.appendChild(modal);
  }

  // Bind close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'trailerModal') {
      window.closeTrailerModal();
    }
  });

  window.openTrailerModal = function(youtubeId, title) {
    modal.innerHTML = `
      <div class="trailer-content">
        <div class="trailer-header">
          <div class="trailer-title">${title} - Official Trailer</div>
          <button class="trailer-close" onclick="window.closeTrailerModal()">✕</button>
        </div>
        <div class="trailer-video-wrap">
          <iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
      </div>
    `;
    modal.classList.add('open');
  };

  window.closeTrailerModal = function() {
    modal.classList.remove('open');
    modal.innerHTML = ''; // Stop the video playing by deleting iframe
  };
}
