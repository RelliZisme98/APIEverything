/* ── Movies & Games Component ── */

const CURATED_MOVIES = [
  {
    title: "Dune: Cát Hành Tinh - Phần 2",
    overview: "Hành trình tiếp theo của Paul Atreides khi anh hợp lực với Chani và người Fremen để trả thù những kẻ âm mưu hủy diệt gia đình mình.",
    poster_path: "/1pdfxvk3ig4G4y5744h28M7uQev.jpg",
    vote_average: 8.3,
    release_date: "2024-03-01",
    trailer_id: "U2Qp5pL3ovA"
  },
  {
    title: "Deadpool & Wolverine",
    overview: "Cặp đôi lập dị nhất của Marvel hội ngộ để cùng thực hiện một sứ mệnh giải cứu vũ trụ đầy hài hước và bạo lực.",
    poster_path: "/8cdWjvZSuw9aojJmGLNNw4HQA5q.jpg",
    vote_average: 8.0,
    release_date: "2024-07-26",
    trailer_id: "73_1biulkYk"
  },
  {
    title: "Những Mảnh Ghép Cảm Xúc 2 (Inside Out 2)",
    overview: "Riley bước vào tuổi dậy thì với những cảm xúc mới xuất hiện như Lo Âu (Anxiety), Ghen Tị (Envy), Xấu Hổ (Embarrassment) náo loạn trung tâm điều khiển.",
    poster_path: "/vpnVM9B6mFJ44vY786QCmHO84jG.jpg",
    vote_average: 7.6,
    release_date: "2024-06-14",
    trailer_id: "LEjhYygAlQI"
  },
  {
    title: "Võ Sĩ Giác Đấu II (Gladiator II)",
    overview: "Nhiều năm sau khi chứng kiến cái chết của người anh hùng Maximus, Lucius buộc phải bước vào đấu trường Colosseum để giành lại vinh quang cho La Mã.",
    poster_path: "/2cxh2j27coQD5GlgiuawY751548.jpg",
    vote_average: 7.5,
    release_date: "2024-11-22",
    trailer_id: "GP3xOJNlqM4"
  },
  {
    title: "Hành Trình Của Moana 2",
    overview: "Nhận được cuộc gọi bất ngờ từ tổ tiên, Moana cùng đoàn thuỷ thủ mới dấn thân vào vùng biển xa xôi đầy thử thách của châu Đại Dương.",
    poster_path: "/yh64q0IC49ii6t6GD460tFAz50v.jpg",
    vote_average: 7.2,
    release_date: "2024-11-27",
    trailer_id: "hDZ7y8RP5HE"
  },
  {
    title: "Wicked: Phù Thuỷ Xứ Oz",
    overview: "Câu chuyện chưa kể về tình bạn phức tạp giữa Elphaba - phù thủy da xanh tương lai và Glinda - phù thủy tốt bụng xứ Oz.",
    poster_path: "/c55zN7v54u2V11bXf6l9B0R10f2.jpg",
    vote_average: 7.4,
    release_date: "2024-11-22",
    trailer_id: "6COmYeLsz4c"
  }
];

const CURATED_GAMES = [
  {
    title: "Hắc Thần Thoại: Ngộ Không",
    overview: "Tựa game nhập vai hành động cốt truyện Tây Du Ký. Người chơi vào vai Thiên Mệnh Nhân dấn thân vào hành trình đầy chông gai để khám phá sự thật.",
    image: "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400",
    rating: 9.0,
    platforms: ["pc", "ps5"],
    publisher: "Game Science"
  },
  {
    title: "Elden Ring: Shadow of the Erdtree",
    overview: "Bản mở rộng cốt truyện lớn nhất của siêu phẩm Elden Ring đưa người chơi khám phá Vùng Đất Bóng Tối đầy nguy hiểm và thử thách.",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400",
    rating: 9.5,
    platforms: ["pc", "ps5", "xbox"],
    publisher: "FromSoftware"
  },
  {
    title: "Grand Theft Auto VI",
    overview: "Siêu phẩm thế giới mở tiếp theo của Rockstar Games, đưa người chơi trở lại thành phố đầy ánh đèn Vice City của bang Leonida.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400",
    rating: 9.8,
    platforms: ["ps5", "xbox"],
    publisher: "Rockstar Games"
  },
  {
    title: "Helldivers 2",
    overview: "Trò chơi bắn súng co-op góc nhìn thứ ba đầy hỗn loạn. Sát cánh cùng đồng đội chiến đấu bảo vệ nền Dân Chủ Siêu Cấp trước các bầy bọ vũ trụ.",
    image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&q=80&w=400",
    rating: 8.5,
    platforms: ["pc", "ps5"],
    publisher: "PlayStation Publishing"
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

function renderMoviesList() {
  const grid = document.getElementById('moviesGrid');
  if (!grid) return;

  grid.innerHTML = CURATED_MOVIES.map(movie => {
    const posterUrl = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400';

    return `
      <div class="media-card">
        <div class="media-poster-wrap">
          <img class="media-poster" src="${posterUrl}" alt="${movie.title}" loading="lazy" />
          <span class="media-rating-badge">★ ${movie.vote_average.toFixed(1)}</span>
        </div>
        <div class="media-body">
          <div>
            <div class="media-card-title">${movie.title}</div>
            <div class="media-meta-info" style="margin-top:2px;">Khởi chiếu: ${movie.release_date}</div>
            <div class="media-card-desc" style="margin-top:6px;">${movie.overview}</div>
          </div>
          <button class="btn-primary" style="padding: 6px 12px; font-size:11px; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="window.openTrailerModal('${movie.trailer_id}', '${movie.title.replace(/'/g, "\\'")}')">
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
