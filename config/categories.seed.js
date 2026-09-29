/**
 * config/categories.seed.js
 * Comprehensive English Adult VOD Categories, Verified Performers & Initial Catalog Seed
 */

const ENGLISH_CATEGORIES = [
  // --- Featured & High Definition ---
  { id: 'cat-4k-uhd', name: '4K Ultra HD', slug: '4k-ultra-hd', group: 'Production', badge: '4K', icon: 'sparkles', featured: true, count: 428 },
  { id: 'cat-exclusive-vip', name: 'Exclusive VIP', slug: 'exclusive-vip', group: 'Production', badge: 'VIP', icon: 'crown', featured: true, count: 312 },
  { id: 'cat-vr-porn', name: 'VR Porn 360°', slug: 'vr-porn-360', group: 'Production', badge: 'VR', icon: 'glasses', featured: true, count: 185 },
  { id: 'cat-60fps-hd', name: '60FPS Full HD', slug: '60fps-full-hd', group: 'Production', badge: '60FPS', icon: 'zap', featured: true, count: 540 },
  { id: 'cat-verified-amateur', name: 'Amateur', slug: 'amateur', group: 'Popular', badge: 'HOT', icon: 'flame', featured: true, count: 890 },
  { id: 'cat-milf', name: 'MILF', slug: 'milf', group: 'Popular', badge: 'TOP', icon: 'heart', featured: true, count: 760 },
  { id: 'cat-anal', name: 'Anal', slug: 'anal', group: 'Popular', badge: 'HOT', icon: 'Compass', featured: true, count: 615 },
  { id: 'cat-lesbian', name: 'Lesbian', slug: 'lesbian', group: 'Popular', badge: 'HOT', icon: 'users', featured: true, count: 530 },
  { id: 'cat-threesome', name: 'Threesome', slug: 'threesome', group: 'Popular', badge: 'TRENDING', icon: 'users', featured: true, count: 445 },
  { id: 'cat-hardcore', name: 'Hardcore', slug: 'hardcore', group: 'Popular', badge: 'HOT', icon: 'flame', featured: true, count: 810 },
  { id: 'cat-pov', name: 'POV', slug: 'pov', group: 'Popular', badge: 'POV', icon: 'video', featured: true, count: 670 },
  { id: 'cat-big-ass', name: 'Big Ass', slug: 'big-ass', group: 'Appearance', badge: 'HOT', icon: 'star', featured: true, count: 720 },
  { id: 'cat-big-tits', name: 'Big Tits', slug: 'big-tits', group: 'Appearance', badge: 'HOT', icon: 'star', featured: true, count: 795 },
  { id: 'cat-blowjob', name: 'Blowjob', slug: 'blowjob', group: 'Popular', badge: '', icon: 'play', featured: true, count: 640 },
  { id: 'cat-creampie', name: 'Creampie', slug: 'creampie', group: 'Popular', badge: 'HOT', icon: 'droplet', featured: true, count: 510 },
  { id: 'cat-squirt', name: 'Squirt', slug: 'squirt', group: 'Popular', badge: '', icon: 'droplet', featured: false, count: 380 },

  // --- Ethnicity & International (English Names) ---
  { id: 'cat-asian', name: 'Asian', slug: 'asian', group: 'International', badge: 'HOT', icon: 'globe', featured: true, count: 490 },
  { id: 'cat-japanese', name: 'Japanese (JAV)', slug: 'japanese-jav', group: 'International', badge: 'JAV', icon: 'globe', featured: true, count: 620 },
  { id: 'cat-latina', name: 'Latina', slug: 'latina', group: 'International', badge: 'HOT', icon: 'globe', featured: true, count: 580 },
  { id: 'cat-ebony', name: 'Ebony', slug: 'ebony', group: 'International', badge: '', icon: 'globe', featured: true, count: 410 },
  { id: 'cat-european', name: 'European', slug: 'european', group: 'International', badge: 'EU', icon: 'globe', featured: true, count: 535 },
  { id: 'cat-russian', name: 'Russian', slug: 'russian', group: 'International', badge: 'HOT', icon: 'globe', featured: true, count: 465 },
  { id: 'cat-french', name: 'French', slug: 'french', group: 'International', badge: '', icon: 'globe', featured: false, count: 230 },
  { id: 'cat-indian', name: 'Indian', slug: 'indian', group: 'International', badge: '', icon: 'globe', featured: false, count: 315 },
  { id: 'cat-arab-persian', name: 'Middle Eastern', slug: 'middle-eastern', group: 'International', badge: 'TRENDING', icon: 'globe', featured: true, count: 290 },
  { id: 'cat-interracial', name: 'Interracial', slug: 'interracial', group: 'International', badge: 'HOT', icon: 'users', featured: true, count: 475 },

  // --- Appearance & Archetypes (18+ Certified) ---
  { id: 'cat-blonde', name: 'Blonde', slug: 'blonde', group: 'Appearance', badge: '', icon: 'sun', featured: true, count: 610 },
  { id: 'cat-brunette', name: 'Brunette', slug: 'brunette', group: 'Appearance', badge: '', icon: 'moon', featured: true, count: 650 },
  { id: 'cat-redhead', name: 'Redhead', slug: 'redhead', group: 'Appearance', badge: 'RARE', icon: 'flame', featured: false, count: 275 },
  { id: 'cat-babe', name: 'Babe (18+)', slug: 'babe-18-plus', group: 'Appearance', badge: '18+', icon: 'sparkles', featured: true, count: 590 },
  { id: 'cat-college', name: 'College (18+)', slug: 'college-18-plus', group: 'Appearance', badge: '18+', icon: 'book', featured: true, count: 430 },
  { id: 'cat-mature', name: 'Mature', slug: 'mature', group: 'Appearance', badge: '', icon: 'award', featured: false, count: 390 },
  { id: 'cat-bbw', name: 'BBW / Curvy', slug: 'bbw-curvy', group: 'Appearance', badge: '', icon: 'heart', featured: false, count: 340 },
  { id: 'cat-petite', name: 'Petite (18+)', slug: 'petite-18-plus', group: 'Appearance', badge: '', icon: 'feather', featured: false, count: 455 },
  { id: 'cat-lingerie', name: 'Lingerie & Stockings', slug: 'lingerie-stockings', group: 'Appearance', badge: 'GLAM', icon: 'star', featured: true, count: 370 },
  { id: 'cat-tattooed', name: 'Tattoo & Alt Girls', slug: 'tattoo-alt-girls', group: 'Appearance', badge: '', icon: 'zap', featured: false, count: 260 },

  // --- Scenarios, Fantasy & Niche ---
  { id: 'cat-massage', name: 'Massage & Oil', slug: 'massage-oil', group: 'Fantasy', badge: 'HOT', icon: 'droplet', featured: true, count: 520 },
  { id: 'cat-casting', name: 'Casting Couch', slug: 'casting-couch', group: 'Fantasy', badge: '', icon: 'camera', featured: true, count: 345 },
  { id: 'cat-roleplay', name: 'Roleplay & Fantasy', slug: 'roleplay-fantasy', group: 'Fantasy', badge: '', icon: 'film', featured: true, count: 480 },
  { id: 'cat-cosplay', name: 'Cosplay', slug: 'cosplay', group: 'Fantasy', badge: 'NEW', icon: 'sparkles', featured: true, count: 295 },
  { id: 'cat-bdsm', name: 'BDSM & Bondage', slug: 'bdsm-bondage', group: 'Fantasy', badge: '', icon: 'lock', featured: true, count: 330 },
  { id: 'cat-fetish', name: 'Fetish & Foot', slug: 'fetish-foot', group: 'Fantasy', badge: '', icon: 'eye', featured: false, count: 415 },
  { id: 'cat-public', name: 'Public & Outdoor', slug: 'public-outdoor', group: 'Fantasy', badge: 'HOT', icon: 'map-pin', featured: true, count: 365 },
  { id: 'cat-couples', name: 'Romantic Couples', slug: 'romantic-couples', group: 'Fantasy', badge: 'LOVE', icon: 'heart', featured: true, count: 410 },
  { id: 'cat-gangbang', name: 'Orgy & Gangbang', slug: 'orgy-gangbang', group: 'Fantasy', badge: '', icon: 'users', featured: false, count: 240 },
  { id: 'cat-cuckold', name: 'Cuckold / Hotwife', slug: 'cuckold-hotwife', group: 'Fantasy', badge: '', icon: 'eye', featured: false, count: 285 },
  { id: 'cat-solo-female', name: 'Solo Female & Toys', slug: 'solo-female-toys', group: 'Fantasy', badge: '', icon: 'user', featured: true, count: 495 },
  { id: 'cat-hentai', name: 'Hentai & 3D Uncensored', slug: 'hentai-3d', group: 'Fantasy', badge: 'ANIME', icon: 'tv', featured: true, count: 560 },
  { id: 'cat-trans', name: 'Transsexual (TS)', slug: 'transsexual', group: 'Fantasy', badge: '', icon: 'sparkles', featured: false, count: 310 },
  { id: 'cat-compilation', name: 'Cumshot & Compilation', slug: 'compilation', group: 'Production', badge: 'MIX', icon: 'layers', featured: false, count: 385 }
];

const VERIFIED_PERFORMERS = [
  { id: 'perf-1', name: 'Eva Laurent', country: 'France', rank: 1, videosCount: 84, views: '14.8M', rating: 99, verified: true, badge: 'TOP #1 STAR', palette: ['#e11d48', '#7f1d1d'] },
  { id: 'perf-2', name: 'Lana Vesper', country: 'Russia', rank: 2, videosCount: 112, views: '12.4M', rating: 98, verified: true, badge: '4K EXCLUSIVE', palette: ['#9333ea', '#3b0764'] },
  { id: 'perf-3', name: 'Valentina Cruz', country: 'Colombia', rank: 3, videosCount: 67, views: '10.9M', rating: 97, verified: true, badge: 'HOT LATINA', palette: ['#f59e0b', '#78350f'] },
  { id: 'perf-4', name: 'Yua Takahashi', country: 'Japan', rank: 4, videosCount: 95, views: '9.6M', rating: 98, verified: true, badge: 'JAV QUEEN', palette: ['#ec4899', '#831843'] },
  { id: 'perf-5', name: 'Scarlett Vance', country: 'USA', rank: 5, videosCount: 78, views: '8.7M', rating: 96, verified: true, badge: 'VIP MODEL', palette: ['#06b6d4', '#164e63'] },
  { id: 'perf-6', name: 'Elena Romanova', country: 'Czechia', rank: 6, videosCount: 53, views: '7.2M', rating: 95, verified: true, badge: 'EU STAR', palette: ['#ef4444', '#450a0a'] },
  { id: 'perf-7', name: 'Naomi Noir', country: 'Brazil', rank: 7, videosCount: 49, views: '6.8M', rating: 96, verified: true, badge: 'TRENDING', palette: ['#10b981', '#064e3b'] },
  { id: 'perf-8', name: 'Chloe Monroe', country: 'UK', rank: 8, videosCount: 61, views: '6.1M', rating: 94, verified: true, badge: 'VERIFIED', palette: ['#6366f1', '#1e1b4b'] }
];

// Helper to generate sleek dark luxury SVG poster data URLs so every video looks hyper-professional out of the box
function createLuxuryPosterSvg(title, subtitle, badge, c1, c2, accent) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="55%" stop-color="#09090d"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="30%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.48"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="sil" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    <rect width="800" height="450" fill="url(#glow)"/>
    <circle cx="610" cy="195" r="145" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="2"/>
    <circle cx="610" cy="195" r="105" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="6 6"/>
    <!-- Artistic studio silhouette & neon lighting bars -->
    <path d="M540 450 C545 340, 565 290, 585 250 C565 220, 570 165, 610 155 C650 165, 655 220, 635 250 C655 290, 675 340, 680 450 Z" fill="url(#sil)" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5"/>
    <rect x="40" y="36" width="110" height="30" rx="6" fill="${accent}"/>
    <text x="95" y="56" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${badge}</text>
    <text x="40" y="340" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" letter-spacing="1">${title}</text>
    <text x="40" y="375" font-family="Arial, sans-serif" font-size="16" fill="#d4d4d8" letter-spacing="2">${subtitle}</text>
    <rect x="40" y="395" width="180" height="3" fill="${accent}" rx="1.5"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Reliable playable HD video streams for instant live player testing
const SAMPLE_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'
];

const INITIAL_VIDEOS = [
  {
    id: 'vid-1001',
    title: 'Midnight Velvet Suite — Exclusive Penthouse Session',
    slug: 'midnight-velvet-suite-exclusive-penthouse-session',
    description: 'Shot in native 4K 60FPS Dolby Vision at the Paris Penthouse Studio. Featuring Eva Laurent in an exclusive uncut VIP production.',
    duration: '38:45',
    quality: '4K UHD',
    fps: '60FPS',
    views: 482900,
    likes: 42150,
    rating: 99,
    isVip: true,
    isFeatured: true,
    performer: 'Eva Laurent',
    categories: ['4K Ultra HD', 'Exclusive VIP', 'European', 'French', 'Lingerie & Stockings', 'Hardcore', 'Romantic Couples'],
    tags: ['4K', 'Uncut', 'Penthouse', 'Paris', 'Lingerie', 'Exclusive'],
    streamUrl: SAMPLE_STREAMS[0],
    thumbnail: createLuxuryPosterSvg('MIDNIGHT VELVET SUITE', 'EVA LAURENT • 4K 60FPS EXCLUSIVE', '4K VIP', '#3b0764', '#4c0519', '#e11d48'),
    createdAt: '2026-09-28T18:30:00Z'
  },
  {
    id: 'vid-1002',
    title: 'Neon Oil & Luxury Spa — Sensual Deep Massage Uncensored',
    slug: 'neon-oil-luxury-spa-sensual-deep-massage',
    description: 'High-gloss oil massage session featuring Lana Vesper & Scarlett Vance in a private luxury spa suite.',
    duration: '44:12',
    quality: '4K UHD',
    fps: '60FPS',
    views: 619400,
    likes: 58900,
    rating: 98,
    isVip: true,
    isFeatured: true,
    performer: 'Lana Vesper',
    categories: ['Massage & Oil', '4K Ultra HD', 'Russian', 'Blonde', 'Lesbian', 'Big Tits'],
    tags: ['Massage', 'Oil', 'Spa', 'Blonde', 'Russian', '4K'],
    streamUrl: SAMPLE_STREAMS[1],
    thumbnail: createLuxuryPosterSvg('NEON OIL & LUXURY SPA', 'LANA VESPER • SENSUAL MASSAGE', '4K 60FPS', '#1e1b4b', '#500724', '#ec4899'),
    createdAt: '2026-09-27T21:15:00Z'
  },
  {
    id: 'vid-1003',
    title: 'Bogota Heatwave — Latina Poolside POV Fantasy',
    slug: 'bogota-heatwave-latina-poolside-pov-fantasy',
    description: 'Valentina Cruz brings intense tropical energy in this immersive first-person POV poolside encounter.',
    duration: '29:18',
    quality: '1080p HD',
    fps: '60FPS',
    views: 354100,
    likes: 31200,
    rating: 97,
    isVip: false,
    isFeatured: true,
    performer: 'Valentina Cruz',
    categories: ['Latina', 'POV', 'Big Ass', 'Brunette', 'Public & Outdoor', 'Hardcore', 'Creampie'],
    tags: ['Latina', 'POV', 'Poolside', 'Outdoor', 'Big Ass'],
    streamUrl: SAMPLE_STREAMS[2],
    thumbnail: createLuxuryPosterSvg('BOGOTA HEATWAVE POV', 'VALENTINA CRUZ • LATINA EXCLUSIVE', 'POV HD', '#451a03', '#3b0764', '#f59e0b'),
    createdAt: '2026-09-26T15:00:00Z'
  },
  {
    id: 'vid-1004',
    title: 'Tokyo After Hours — Uncensored JAV Hotel Suite',
    slug: 'tokyo-after-hours-uncensored-jav-hotel-suite',
    description: 'Authentic Tokyo Shibuya luxury suite production starring Yua Takahashi in an uncut cosplayer & lingerie fantasy.',
    duration: '52:10',
    quality: '4K UHD',
    fps: '60FPS',
    views: 529000,
    likes: 49800,
    rating: 99,
    isVip: true,
    isFeatured: false,
    performer: 'Yua Takahashi',
    categories: ['Japanese (JAV)', 'Asian', 'Cosplay', '4K Ultra HD', 'Roleplay & Fantasy', 'Petite (18+)'],
    tags: ['JAV', 'Tokyo', 'Uncensored', 'Asian', 'Cosplay'],
    streamUrl: SAMPLE_STREAMS[3],
    thumbnail: createLuxuryPosterSvg('TOKYO AFTER HOURS', 'YUA TAKAHASHI • UNCENSORED JAV', 'JAV 4K', '#4a044e', '#0f172a', '#d946ef'),
    createdAt: '2026-09-25T20:00:00Z'
  },
  {
    id: 'vid-1005',
    title: 'Prague Casting Audition — Backstage Amateur First Time',
    slug: 'prague-casting-audition-backstage-amateur',
    description: 'Backstage European casting session in Prague featuring Elena Romanova in her highest-rated studio audition.',
    duration: '34:05',
    quality: '1080p HD',
    fps: '60FPS',
    views: 412800,
    likes: 36500,
    rating: 96,
    isVip: false,
    isFeatured: false,
    performer: 'Elena Romanova',
    categories: ['Casting Couch', 'Amateur', 'European', 'Babe (18+)', 'Blowjob', 'POV'],
    tags: ['Casting', 'Prague', 'Amateur', 'Audition', 'European'],
    streamUrl: SAMPLE_STREAMS[4],
    thumbnail: createLuxuryPosterSvg('PRAGUE CASTING COUCH', 'ELENA ROMANOVA • BACKSTAGE HD', 'CASTING', '#450a0a', '#111827', '#ef4444'),
    createdAt: '2026-09-24T12:40:00Z'
  },
  {
    id: 'vid-1006',
    title: 'Beverly Hills Trophy MILF — Private Villa Encounter',
    slug: 'beverly-hills-trophy-milf-private-villa',
    description: 'Scarlett Vance stars as a glamorous Beverly Hills host in this cinema-grade 4K production.',
    duration: '41:50',
    quality: '4K UHD',
    fps: '60FPS',
    views: 745200,
    likes: 68400,
    rating: 98,
    isVip: true,
    isFeatured: true,
    performer: 'Scarlett Vance',
    categories: ['MILF', 'Big Tits', 'Blonde', '4K Ultra HD', 'Hardcore', 'Anal', 'Lingerie & Stockings'],
    tags: ['MILF', 'Beverly Hills', 'Blonde', 'Luxury', '4K'],
    streamUrl: SAMPLE_STREAMS[0],
    thumbnail: createLuxuryPosterSvg('BEVERLY HILLS MILF', 'SCARLETT VANCE • PRIVATE VILLA', 'TOP MILF', '#083344', '#3b0764', '#06b6d4'),
    createdAt: '2026-09-23T19:10:00Z'
  },
  {
    id: 'vid-1007',
    title: 'Crimson Dungeon — Luxury BDSM & Shibari Artistry',
    slug: 'crimson-dungeon-luxury-bdsm-shibari-artistry',
    description: 'High-fashion BDSM and velvet restraint session with Naomi Noir in a custom-lit underground studio.',
    duration: '36:22',
    quality: '4K UHD',
    fps: '60FPS',
    views: 289400,
    likes: 25100,
    rating: 95,
    isVip: true,
    isFeatured: false,
    performer: 'Naomi Noir',
    categories: ['BDSM & Bondage', 'Fetish & Foot', 'Ebony', 'Exclusive VIP', 'Roleplay & Fantasy'],
    tags: ['BDSM', 'Bondage', 'Fetish', 'Domination', 'VIP'],
    streamUrl: SAMPLE_STREAMS[1],
    thumbnail: createLuxuryPosterSvg('CRIMSON VELVET BDSM', 'NAOMI NOIR • FETISH EXCLUSIVE', 'VIP BDSM', '#4c0519', '#09090b', '#f43f5e'),
    createdAt: '2026-09-22T22:00:00Z'
  },
  {
    id: 'vid-1008',
    title: 'VIP Yacht Threesome — Mediterranean Sunset Party',
    slug: 'vip-yacht-threesome-mediterranean-sunset',
    description: 'Eva Laurent and Chloe Monroe aboard a private superyacht off Monaco in 60FPS Full HD.',
    duration: '47:30',
    quality: '4K UHD',
    fps: '60FPS',
    views: 598000,
    likes: 54200,
    rating: 99,
    isVip: true,
    isFeatured: false,
    performer: 'Chloe Monroe',
    categories: ['Threesome', 'Lesbian', 'European', 'Public & Outdoor', '60FPS Full HD', 'Big Ass'],
    tags: ['Threesome', 'Yacht', 'Monaco', 'Outdoor', '60FPS'],
    streamUrl: SAMPLE_STREAMS[2],
    thumbnail: createLuxuryPosterSvg('MONACO YACHT THREESOME', 'CHLOE MONROE & EVA • 60FPS', 'THREESOME', '#1e1b4b', '#4c0519', '#8b5cf6'),
    createdAt: '2026-09-21T17:45:00Z'
  },
  {
    id: 'vid-1009',
    title: 'VR 360° Cyber Bedroom — Interactive Close-Up Experience',
    slug: 'vr-360-cyber-bedroom-interactive-experience',
    description: 'Binocular 8K/4K VR 180/360 stereoscopic stream designed for Meta Quest, Apple Vision & desktop POV.',
    duration: '31:15',
    quality: '4K UHD',
    fps: '60FPS',
    views: 318700,
    likes: 29400,
    rating: 97,
    isVip: true,
    isFeatured: false,
    performer: 'Lana Vesper',
    categories: ['VR Porn 360°', 'POV', 'Solo Female & Toys', 'Cosplay', '4K Ultra HD'],
    tags: ['VR', '360', 'POV', 'Interactive', 'Cosplay'],
    streamUrl: SAMPLE_STREAMS[3],
    thumbnail: createLuxuryPosterSvg('VR 360° CYBER SUITE', 'IMMERSIVE BINAURAL POV EXPERIENCE', 'VR 360°', '#042f2e', '#31102f', '#14b8a6'),
    createdAt: '2026-09-20T14:20:00Z'
  },
  {
    id: 'vid-1010',
    title: 'Campus Dorm After Party — Verified 18+ College Special',
    slug: 'campus-dorm-after-party-verified-18-college',
    description: 'High-energy dorm room party episode featuring verified 18+ performers in 1080p 60FPS.',
    duration: '27:40',
    quality: '1080p HD',
    fps: '60FPS',
    views: 467500,
    likes: 41300,
    rating: 96,
    isVip: false,
    isFeatured: false,
    performer: 'Chloe Monroe',
    categories: ['College (18+)', 'Babe (18+)', 'Amateur', 'Threesome', 'Oral', 'Blowjob'],
    tags: ['College', '18+', 'Dorm', 'Amateur', 'Party'],
    streamUrl: SAMPLE_STREAMS[4],
    thumbnail: createLuxuryPosterSvg('CAMPUS AFTER PARTY', 'CHLOE MONROE • VERIFIED 18+ HD', '18+ HD', '#3b0764', '#172554', '#a855f7'),
    createdAt: '2026-09-19T16:00:00Z'
  },
  {
    id: 'vid-1011',
    title: 'Arabian Nights Velvet Lounge — Exotic Bellydance & Glamour',
    slug: 'arabian-nights-velvet-lounge-exotic-glamour',
    description: 'Exotic luxury lounge performance with sensual choreography and uncut private suite finale.',
    duration: '39:08',
    quality: '4K UHD',
    fps: '60FPS',
    views: 538900,
    likes: 49100,
    rating: 98,
    isVip: true,
    isFeatured: false,
    performer: 'Valentina Cruz',
    categories: ['Middle Eastern', 'Lingerie & Stockings', 'Big Ass', 'Brunette', 'Exclusive VIP', 'Romantic Couples'],
    tags: ['Exotic', 'Middle Eastern', 'Glamour', 'VIP', '4K'],
    streamUrl: SAMPLE_STREAMS[0],
    thumbnail: createLuxuryPosterSvg('VELVET MIRAGE LOUNGE', 'EXOTIC GLAMOUR • UNCUT 4K VIP', 'TRENDING', '#451a03', '#4c0519', '#fbbf24'),
    createdAt: '2026-09-18T21:00:00Z'
  },
  {
    id: 'vid-1012',
    title: 'Cyberpunk 3D Uncensored — Neon Succubus Episode IV',
    slug: 'cyberpunk-3d-uncensored-neon-succubus-ep4',
    description: '60FPS ray-traced 3D anime / hentai fantasy rendered in ultra-crisp 4K with full English voiceover.',
    duration: '22:55',
    quality: '4K UHD',
    fps: '60FPS',
    views: 389200,
    likes: 37800,
    rating: 98,
    isVip: false,
    isFeatured: false,
    performer: 'Yua Takahashi',
    categories: ['Hentai & 3D Uncensored', 'Cosplay', 'Roleplay & Fantasy', '60FPS Full HD'],
    tags: ['Hentai', '3D', 'Uncensored', '60FPS', 'Anime'],
    streamUrl: SAMPLE_STREAMS[1],
    thumbnail: createLuxuryPosterSvg('CYBERPUNK 3D FANTASY', 'RAY-TRACED 60FPS UNCENSORED', '3D ANIME', '#31102f', '#090d16', '#ec4899'),
    createdAt: '2026-09-17T19:30:00Z'
  }
];

module.exports = {
  ENGLISH_CATEGORIES,
  VERIFIED_PERFORMERS,
  INITIAL_VIDEOS,
  createLuxuryPosterSvg,
  SAMPLE_STREAMS
};
