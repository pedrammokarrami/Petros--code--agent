/**
 * PETROS Blueprint Registry — single source of truth for the 13 spatial rooms
 * and the 52-agent swarm (1 Lead + 3 Specialists per room).
 *
 * Every room carries:
 *  - the agent roster and attire (what the humanoid GLBs must wear)
 *  - the domain props that must exist at each workstation
 *  - the licensed asset repositories those props come from (see ATTRIBUTION)
 *  - the zero-cost domain feeds its specialists are allowed to call
 *
 * Nothing in this file performs I/O; it is pure data so both the browser bundle
 * and the server routers can import it.
 */

export type RoomId =
  | 'rnd'
  | 'clinical'
  | 'factory'
  | 'virtual-production'
  | 'bio-lab'
  | 'hydroponics'
  | 'clean-energy'
  | 'fintech'
  | 'architecture'
  | 'fulfillment'
  | 'learning'
  | 'robotics'
  | 'treasury';

export type AssetLicense = 'CC0' | 'CC-BY' | 'MIT' | 'Public Domain' | 'Free tier';

export interface AssetSource {
  repository: string;
  url: string;
  license: AssetLicense;
  /** CC-BY (and similar) obliges us to credit the original author in the UI. */
  attributionRequired: boolean;
}

export interface PropSpec {
  label: { en: string; fa: string };
  /** Search keywords to use when sourcing the GLB. */
  keywords: string[];
}

export interface FeedQuota {
  /** Requests allowed inside `windowMs`. `null` means unmetered for reasonable use. */
  limit: number | null;
  windowMs: number;
  /** Minimum spacing between two calls, for upstreams that cap requests per second. */
  minIntervalMs?: number;
  /** Extra hard constraints (concurrency, byte caps, mandatory headers). */
  notes?: string;
}

export interface FeedSpec {
  id: string;
  label: string;
  /** Upstream base URL, no query string. */
  endpoint: string;
  quota: FeedQuota;
  /** True when the browser cannot legally/technically call it (UA policy, rate policy). */
  serverSideOnly: boolean;
  /** True when the feed costs nothing but requires an OPTIONAL free API key. */
  optionalKey?: string;
  description: { en: string; fa: string };
}

export type AgentKind = 'lead' | 'specialist';

export interface AgentSpec {
  /** Stable id: `<roomId>.<slug>` — used for animation bindings and telemetry. */
  id: string;
  roomId: RoomId;
  kind: AgentKind;
  role: { en: string; fa: string };
  /** Humanoid clothing brief used when generating the Ready Player Me avatar. */
  attire: { en: string; fa: string };
  /** Where this agent stands in the room. */
  station: { en: string; fa: string };
  /** Local/edge model preferred for this agent when no cloud quota remains. */
  model: string;
}

export interface RoomSpec {
  id: RoomId;
  index: number;
  name: { en: string; fa: string };
  tagline: { en: string; fa: string };
  /** Tailwind-friendly accent used by the room chrome. */
  accent: string;
  props: PropSpec[];
  sources: AssetSource[];
  feeds: FeedSpec[];
  agents: [AgentSpec, AgentSpec, AgentSpec, AgentSpec];
}

const SOURCES = {
  polyPizza: {
    repository: 'Poly Pizza',
    url: 'https://poly.pizza',
    license: 'CC0' as AssetLicense,
    attributionRequired: false,
  },
  nih3d: {
    repository: 'NIH 3D Print Exchange',
    url: 'https://3dprint.nih.gov',
    license: 'Public Domain' as AssetLicense,
    attributionRequired: false,
  },
  nasa3d: {
    repository: 'NASA 3D Resources',
    url: 'https://nasa3d.arc.nasa.gov',
    license: 'Public Domain' as AssetLicense,
    attributionRequired: false,
  },
  sketchfab: {
    repository: 'Sketchfab',
    url: 'https://sketchfab.com',
    license: 'CC-BY' as AssetLicense,
    attributionRequired: true,
  },
  polyHaven: {
    repository: 'Poly Haven',
    url: 'https://polyhaven.com',
    license: 'CC0' as AssetLicense,
    attributionRequired: false,
  },
  grabcad: {
    repository: 'GrabCAD',
    url: 'https://grabcad.com',
    license: 'CC-BY' as AssetLicense,
    attributionRequired: true,
  },
  thingiverse: {
    repository: 'Thingiverse',
    url: 'https://thingiverse.com',
    license: 'CC-BY' as AssetLicense,
    attributionRequired: true,
  },
  free3d: {
    repository: 'Free3D',
    url: 'https://free3d.com',
    license: 'CC-BY' as AssetLicense,
    attributionRequired: true,
  },
  bimobject: {
    repository: 'BIMobject',
    url: 'https://bimobject.com',
    license: 'Free tier' as AssetLicense,
    attributionRequired: true,
  },
} satisfies Record<string, AssetSource>;

const FEEDS = {
  github: {
    id: 'github',
    label: 'GitHub REST API',
    endpoint: 'https://api.github.com',
    quota: { limit: 60, windowMs: 60 * 60 * 1000, notes: '60/h anonymous, 5,000/h with a free PAT' },
    serverSideOnly: false,
    optionalKey: 'GITHUB_TOKEN',
    description: {
      en: 'Repository intelligence, code review context and licence discovery.',
      fa: 'هوش مخازن، زمینه‌ی بازبینی کد و کشف مجوز.',
    },
  },
  openfda: {
    id: 'openfda',
    label: 'OpenFDA',
    endpoint: 'https://api.fda.gov',
    quota: { limit: 240, windowMs: 60 * 1000, notes: 'Be polite; cache aggressively' },
    serverSideOnly: false,
    description: {
      en: 'Adverse drug events, device recalls and epidemiological mining.',
      fa: 'رویدادهای نامطلوب دارویی، فراخوان تجهیزات و کاوش اپیدمیولوژیک.',
    },
  },
  clinicalTrials: {
    id: 'clinicalTrials',
    label: 'ClinicalTrials.gov',
    endpoint: 'https://clinicaltrials.gov/api/v2',
    quota: { limit: 1000, windowMs: 24 * 60 * 60 * 1000, notes: '~1,000 requests per day' },
    serverSideOnly: false,
    description: {
      en: 'Trial status, eligibility and endpoint data for clinical research.',
      fa: 'وضعیت کارآزمایی، معیارهای ورود و داده‌ی نقاط پایانی.',
    },
  },
  huggingFace: {
    id: 'huggingFace',
    label: 'Hugging Face Inference',
    endpoint: 'https://api-inference.huggingface.co',
    quota: { limit: 120, windowMs: 60 * 60 * 1000, notes: 'Free serverless tier, credits based' },
    serverSideOnly: false,
    optionalKey: 'HF_TOKEN',
    description: {
      en: 'Serverless inference for anomaly detection and image generation.',
      fa: 'استنتاج بدون سرور برای تشخیص ناهنجاری و تولید تصویر.',
    },
  },
  unsplash: {
    id: 'unsplash',
    label: 'Unsplash',
    endpoint: 'https://api.unsplash.com',
    quota: { limit: 50, windowMs: 60 * 60 * 1000, notes: '50 requests per hour for demo apps' },
    serverSideOnly: false,
    optionalKey: 'UNSPLASH_ACCESS_KEY',
    description: {
      en: 'Free high-resolution stock imagery for storyboards.',
      fa: 'تصاویر استوک رایگان با کیفیت بالا برای استوری‌بورد.',
    },
  },
  pubchem: {
    id: 'pubchem',
    label: 'PubChem PUG REST',
    endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug',
    quota: {
      limit: 400,
      windowMs: 60 * 1000,
      minIntervalMs: 200,
      notes: 'Max 5 requests/second, 400/minute; upstream uses a traffic-light throttle',
    },
    serverSideOnly: false,
    description: {
      en: 'Chemical structures, molecular weights and synonyms.',
      fa: 'ساختارهای شیمیایی، وزن مولکولی و نام‌های مترادف.',
    },
  },
  openMeteo: {
    id: 'openMeteo',
    label: 'Open-Meteo',
    endpoint: 'https://api.open-meteo.com',
    quota: { limit: 10000, windowMs: 24 * 60 * 60 * 1000, notes: 'Free for non-commercial use' },
    serverSideOnly: false,
    description: {
      en: 'Micro-climate telemetry driving hydroponic yield models.',
      fa: 'داده‌ی اقلیم خرد برای مدل بهره‌وری هیدروپونیک.',
    },
  },
  overpass: {
    id: 'overpass',
    label: 'Overpass API (OpenStreetMap)',
    endpoint: 'https://overpass-api.de/api/interpreter',
    quota: {
      limit: 2,
      windowMs: 1000,
      minIntervalMs: 500,
      notes: '2 concurrent slots per IP; send [timeout:180][maxsize:536870912]',
    },
    serverSideOnly: true,
    description: {
      en: 'Farmland, power-grid and building-footprint geometry.',
      fa: 'هندسه‌ی زمین کشاورزی، شبکه‌ی برق و ردپای ساختمان‌ها.',
    },
  },
  nasa: {
    id: 'nasa',
    label: 'NASA Open APIs',
    endpoint: 'https://api.nasa.gov',
    quota: { limit: 1000, windowMs: 60 * 60 * 1000, notes: '1,000 requests per hour' },
    serverSideOnly: false,
    optionalKey: 'NASA_API_KEY',
    description: {
      en: 'Planetary data and satellite imagery for grid analysis.',
      fa: 'داده‌ی سیاره‌ای و تصاویر ماهواره‌ای برای تحلیل شبکه.',
    },
  },
  coinGecko: {
    id: 'coinGecko',
    label: 'CoinGecko',
    endpoint: 'https://api.coingecko.com/api/v3',
    quota: { limit: 10000, windowMs: 30 * 24 * 60 * 60 * 1000, notes: '10,000 monthly calls (demo tier)' },
    serverSideOnly: true,
    description: {
      en: 'Live crypto prices for the quant desk.',
      fa: 'قیمت زنده‌ی رمزارزها برای میز کوانت.',
    },
  },
  frankfurter: {
    id: 'frankfurter',
    label: 'Frankfurter (ECB)',
    endpoint: 'https://api.frankfurter.app',
    quota: { limit: null, windowMs: 60 * 1000, notes: 'No auth, no published cap' },
    serverSideOnly: false,
    description: {
      en: 'Fiat exchange rates sourced from the European Central Bank.',
      fa: 'نرخ ارز فیات بر پایه‌ی بانک مرکزی اروپا.',
    },
  },
  nominatim: {
    id: 'nominatim',
    label: 'Nominatim (OpenStreetMap)',
    endpoint: 'https://nominatim.openstreetmap.org',
    quota: {
      limit: 1,
      windowMs: 1000,
      minIntervalMs: 1000,
      notes: '1 request/second, custom User-Agent mandatory; default browser UA is blocked',
    },
    serverSideOnly: true,
    description: {
      en: 'Geocoding warehouse addresses.',
      fa: 'ژئوکد کردن آدرس انبارها.',
    },
  },
  wikipedia: {
    id: 'wikipedia',
    label: 'Wikipedia API',
    endpoint: 'https://en.wikipedia.org/w/api.php',
    quota: { limit: null, windowMs: 60 * 1000, notes: 'Unmetered for reasonable use' },
    serverSideOnly: false,
    description: {
      en: 'Full-text knowledge retrieval for tutoring agents.',
      fa: 'بازیابی متن کامل دانش برای ایجنت‌های آموزشی.',
    },
  },
  arxiv: {
    id: 'arxiv',
    label: 'arXiv API',
    endpoint: 'http://export.arxiv.org/api',
    quota: { limit: null, windowMs: 60 * 1000, notes: 'Unmetered for reasonable use' },
    serverSideOnly: false,
    description: {
      en: 'Open scientific pre-prints for curriculum building.',
      fa: 'پیش‌چاپ‌های علمی باز برای ساخت برنامه‌ی درسی.',
    },
  },
  hfHub: {
    id: 'hfHub',
    label: 'Hugging Face Hub',
    endpoint: 'https://huggingface.co/api',
    quota: { limit: 300, windowMs: 60 * 60 * 1000, notes: 'Anonymous browsing is rate limited' },
    serverSideOnly: false,
    description: {
      en: 'Model weights discovery and topology evaluation.',
      fa: 'کشف وزن‌های مدل و ارزیابی توپولوژی شبکه.',
    },
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini 2.0 Flash (free tier)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    quota: {
      limit: 15,
      windowMs: 60 * 1000,
      notes: '15 RPM, 1,000,000 TPM, 1,500 RPD on the free tier',
    },
    serverSideOnly: true,
    optionalKey: 'GEMINI_API_KEY',
    description: {
      en: 'Long-context reasoning over ledgers, CSV dumps and codebases.',
      fa: 'استدلال با زمینه‌ی بلند روی دفترها، CSV و کدبیس.',
    },
  },
} satisfies Record<string, FeedSpec>;

export const FEED_SPECS: Record<string, FeedSpec> = FEEDS;

export function getFeedSpec(id: string): FeedSpec | undefined {
  return FEEDS[id as keyof typeof FEEDS];
}

function agent(
  roomId: RoomId,
  kind: AgentKind,
  slug: string,
  role: { en: string; fa: string },
  attire: { en: string; fa: string },
  station: { en: string; fa: string },
  model: string,
): AgentSpec {
  return { id: `${roomId}.${slug}`, roomId, kind, role, attire, station, model };
}

const LEAD_MODEL = 'gemini-2.0-flash';
const EDGE_MODEL = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';
const EDGE_REASONER = 'DeepSeek-R1-Distill-Qwen-7B';

export const PETROS_ROOMS: RoomSpec[] = [
  {
    id: 'rnd',
    index: 1,
    name: { en: 'Software & Technology', fa: 'نرم‌افزار و فناوری' },
    tagline: { en: 'R&D Lab — ship the codebase', fa: 'آزمایشگاه تحقیق و توسعه — تحویل کدبیس' },
    accent: '#4FB8FF',
    props: [
      { label: { en: 'Server rack', fa: 'رک سرور' }, keywords: ['server rack', 'rack cabinet'] },
      { label: { en: 'Dual-monitor workstation', fa: 'ایستگاه دو مانیتوره' }, keywords: ['desk', 'monitor'] },
      { label: { en: 'Mechanical keyboard', fa: 'کیبورد مکانیکی' }, keywords: ['mechanical keyboard'] },
    ],
    sources: [SOURCES.polyPizza, SOURCES.sketchfab],
    feeds: [FEEDS.github, FEEDS.huggingFace],
    agents: [
      agent('rnd', 'lead', 'lead', { en: 'Lead Architect', fa: 'معمار ارشد' },
        { en: 'Casual tech wear', fa: 'پوشش فنی روزمره' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('rnd', 'specialist', 'engineer-1', { en: 'Backend Engineer', fa: 'مهندس بک‌اند' },
        { en: 'Casual tech wear', fa: 'پوشش فنی روزمره' },
        { en: 'Server rack', fa: 'رک سرور' }, EDGE_MODEL),
      agent('rnd', 'specialist', 'engineer-2', { en: 'Frontend Engineer', fa: 'مهندس فرانت‌اند' },
        { en: 'Casual tech wear', fa: 'پوشش فنی روزمره' },
        { en: 'Dual-monitor desk', fa: 'میز دو مانیتوره' }, EDGE_MODEL),
      agent('rnd', 'specialist', 'reviewer', { en: 'Code Reviewer', fa: 'بازبین کد' },
        { en: 'Casual tech wear', fa: 'پوشش فنی روزمره' },
        { en: 'Code wall', fa: 'دیوار کد' }, EDGE_REASONER),
    ],
  },
  {
    id: 'clinical',
    index: 2,
    name: { en: 'Medical & Healthcare', fa: 'پزشکی و سلامت' },
    tagline: { en: 'Clinical Research — evidence first', fa: 'پژوهش بالینی — اول شواهد' },
    accent: '#5EEAD4',
    props: [
      { label: { en: 'Anatomical model', fa: 'مدل آناتومیک' }, keywords: ['anatomy', 'skeleton'] },
      { label: { en: 'Centrifuge', fa: 'سانتریفیوژ' }, keywords: ['centrifuge', 'lab equipment'] },
      { label: { en: 'Imaging mock rig', fa: 'ماکت دستگاه تصویربرداری' }, keywords: ['mri', 'scanner'] },
    ],
    sources: [SOURCES.nih3d, SOURCES.sketchfab],
    feeds: [FEEDS.openfda, FEEDS.clinicalTrials],
    agents: [
      agent('clinical', 'lead', 'lead', { en: 'Lead Investigator', fa: 'پژوهشگر ارشد' },
        { en: 'Lab coat', fa: 'روپوش آزمایشگاه' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('clinical', 'specialist', 'researcher-1', { en: 'Clinical Researcher', fa: 'پژوهشگر بالینی' },
        { en: 'Scrubs', fa: 'اسکراب' },
        { en: 'Trial registry desk', fa: 'میز ثبت کارآزمایی' }, EDGE_MODEL),
      agent('clinical', 'specialist', 'researcher-2', { en: 'Pharmacovigilance Analyst', fa: 'تحلیلگر ایمنی دارو' },
        { en: 'Scrubs', fa: 'اسکراب' },
        { en: 'Adverse-event wall', fa: 'دیوار رویدادهای نامطلوب' }, EDGE_MODEL),
      agent('clinical', 'specialist', 'researcher-3', { en: 'Biostatistician', fa: 'آمارشناس زیستی' },
        { en: 'Lab coat', fa: 'روپوش آزمایشگاه' },
        { en: 'Centrifuge bench', fa: 'میز سانتریفیوژ' }, EDGE_REASONER),
    ],
  },
  {
    id: 'factory',
    index: 3,
    name: { en: 'Industrial & Manufacturing', fa: 'صنعت و تولید' },
    tagline: { en: 'Robotic Factory — lights-out cell', fa: 'کارخانه‌ی رباتیک — سلول بی‌نیروی انسانی' },
    accent: '#F59E0B',
    props: [
      { label: { en: 'Robotic arm', fa: 'بازوی رباتیک' }, keywords: ['robotic arm', 'industrial robot'] },
      { label: { en: 'CNC machine', fa: 'دستگاه CNC' }, keywords: ['cnc machine'] },
      { label: { en: 'Conveyor belt', fa: 'نوار نقاله' }, keywords: ['conveyor belt'] },
    ],
    sources: [SOURCES.grabcad, SOURCES.thingiverse],
    feeds: [FEEDS.huggingFace],
    agents: [
      agent('factory', 'lead', 'lead', { en: 'Floor Manager', fa: 'مدیر سالن' },
        { en: 'Hard hat + high-vis vest', fa: 'کلاه ایمنی و جلیقه‌ی شبرنگ' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('factory', 'specialist', 'technician-1', { en: 'Robotics Technician', fa: 'تکنسین رباتیک' },
        { en: 'Hard hat + high-vis vest', fa: 'کلاه ایمنی و جلیقه‌ی شبرنگ' },
        { en: 'Robot cell', fa: 'سلول ربات' }, EDGE_MODEL),
      agent('factory', 'specialist', 'technician-2', { en: 'CNC Operator', fa: 'اپراتور CNC' },
        { en: 'Hard hat + high-vis vest', fa: 'کلاه ایمنی و جلیقه‌ی شبرنگ' },
        { en: 'Machining bay', fa: 'غرفه‌ی ماشین‌کاری' }, EDGE_MODEL),
      agent('factory', 'specialist', 'technician-3', { en: 'Anomaly Analyst', fa: 'تحلیلگر ناهنجاری' },
        { en: 'Hard hat + high-vis vest', fa: 'کلاه ایمنی و جلیقه‌ی شبرنگ' },
        { en: 'Telemetry board', fa: 'تخته‌ی تله‌متری' }, EDGE_MODEL),
    ],
  },
  {
    id: 'virtual-production',
    index: 4,
    name: { en: 'Entertainment & Media', fa: 'سرگرمی و رسانه' },
    tagline: { en: 'Virtual Production — stage in a volume', fa: 'تولید مجازی — صحنه در حجم' },
    accent: '#C084FC',
    props: [
      { label: { en: 'Cinema camera', fa: 'دوربین سینمایی' }, keywords: ['cinema camera', 'film camera'] },
      { label: { en: 'Lighting rig', fa: 'ریگ نورپردازی' }, keywords: ['lighting rig', 'studio light'] },
      { label: { en: 'Green screen cyclorama', fa: 'سایکلوراما پرده‌ی سبز' }, keywords: ['green screen'] },
    ],
    sources: [SOURCES.sketchfab, SOURCES.polyPizza],
    feeds: [FEEDS.unsplash, FEEDS.huggingFace],
    agents: [
      agent('virtual-production', 'lead', 'lead', { en: 'Director', fa: 'کارگردان' },
        { en: 'Dark studio clothing', fa: 'پوشاک تیره‌ی استودیو' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('virtual-production', 'specialist', 'editor-1', { en: 'Storyboard Editor', fa: 'تدوینگر استوری‌بورد' },
        { en: 'Dark studio clothing', fa: 'پوشاک تیره‌ی استودیو' },
        { en: 'Storyboard wall', fa: 'دیوار استوری‌بورد' }, EDGE_MODEL),
      agent('virtual-production', 'specialist', 'editor-2', { en: 'Colourist', fa: 'تصحیح‌گر رنگ' },
        { en: 'Headset', fa: 'هدست' },
        { en: 'Grade suite', fa: 'سوییت تصحیح رنگ' }, EDGE_MODEL),
      agent('virtual-production', 'specialist', 'editor-3', { en: 'Audio Engineer', fa: 'مهندس صدا' },
        { en: 'Headset', fa: 'هدست' },
        { en: 'Audio console', fa: 'کنسول صدا' }, EDGE_MODEL),
    ],
  },
  {
    id: 'bio-lab',
    index: 5,
    name: { en: 'Science & Biotechnology', fa: 'علم و بیوتکنولوژی' },
    tagline: { en: 'Bio-Lab — wet work, dry proof', fa: 'بیولب — کار تر، اثبات خشک' },
    accent: '#34D399',
    props: [
      { label: { en: 'Electron microscope', fa: 'میکروسکوپ الکترونی' }, keywords: ['electron microscope'] },
      { label: { en: 'Bioreactor', fa: 'بیوراکتور' }, keywords: ['bioreactor', 'fermenter'] },
      { label: { en: 'Test tube rack', fa: 'استند لوله آزمایش' }, keywords: ['test tube rack'] },
    ],
    sources: [SOURCES.nih3d, SOURCES.sketchfab],
    feeds: [FEEDS.pubchem],
    agents: [
      agent('bio-lab', 'lead', 'lead', { en: 'Lead Scientist', fa: 'دانشمند ارشد' },
        { en: 'Sterile coat', fa: 'روپوش استریل' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('bio-lab', 'specialist', 'tech-1', { en: 'Lab Technician', fa: 'تکنسین آزمایشگاه' },
        { en: 'Hazmat suit', fa: 'لباس حفاظتی' },
        { en: 'Bench A', fa: 'میز الف' }, EDGE_MODEL),
      agent('bio-lab', 'specialist', 'tech-2', { en: 'Molecular Analyst', fa: 'تحلیلگر مولکولی' },
        { en: 'Hazmat suit', fa: 'لباس حفاظتی' },
        { en: 'Compound terminal', fa: 'ترمینال ترکیبات' }, EDGE_MODEL),
      agent('bio-lab', 'specialist', 'tech-3', { en: 'Assay Operator', fa: 'اپراتور سنجش' },
        { en: 'Sterile coat', fa: 'روپوش استریل' },
        { en: 'Bioreactor bay', fa: 'غرفه‌ی بیوراکتور' }, EDGE_MODEL),
    ],
  },
  {
    id: 'hydroponics',
    index: 6,
    name: { en: 'Agriculture & Food', fa: 'کشاورزی و غذا' },
    tagline: { en: 'Smart Hydroponics — yield per watt', fa: 'هیدروپونیک هوشمند — محصول به ازای هر وات' },
    accent: '#A3E635',
    props: [
      { label: { en: 'Vertical farm rack', fa: 'قفسه‌ی کشت عمودی' }, keywords: ['vertical farm', 'grow rack'] },
      { label: { en: 'Hydroponic pipe', fa: 'لوله‌ی هیدروپونیک' }, keywords: ['hydroponics', 'pvc pipe'] },
      { label: { en: 'UV grow light', fa: 'لامپ رشد UV' }, keywords: ['grow light', 'led panel'] },
    ],
    sources: [SOURCES.sketchfab, SOURCES.polyPizza],
    feeds: [FEEDS.openMeteo, FEEDS.overpass],
    agents: [
      agent('hydroponics', 'lead', 'lead', { en: 'Lead Agronomist', fa: 'زراعت‌شناس ارشد' },
        { en: 'Apron', fa: 'پیش‌بند' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('hydroponics', 'specialist', 'botanist-1', { en: 'Botanist', fa: 'گیاه‌شناس' },
        { en: 'Apron', fa: 'پیش‌بند' },
        { en: 'Rack row A', fa: 'ردیف الف' }, EDGE_MODEL),
      agent('hydroponics', 'specialist', 'botanist-2', { en: 'Nutrient Chemist', fa: 'شیمیست مواد مغذی' },
        { en: 'Outdoor wear', fa: 'پوشاک کار بیرونی' },
        { en: 'Nutrient mixing bay', fa: 'غرفه‌ی ترکیب مواد مغذی' }, EDGE_MODEL),
      agent('hydroponics', 'specialist', 'botanist-3', { en: 'Climate Analyst', fa: 'تحلیلگر اقلیم' },
        { en: 'Outdoor wear', fa: 'پوشاک کار بیرونی' },
        { en: 'Weather board', fa: 'تخته‌ی هواشناسی' }, EDGE_MODEL),
    ],
  },
  {
    id: 'clean-energy',
    index: 7,
    name: { en: 'Energy & Environment', fa: 'انرژی و محیط زیست' },
    tagline: { en: 'Clean Energy Hub — grid first', fa: 'قطب انرژی پاک — اول شبکه' },
    accent: '#38BDF8',
    props: [
      { label: { en: 'Wind turbine', fa: 'توربین بادی' }, keywords: ['wind turbine'] },
      { label: { en: 'Solar array', fa: 'آرایه‌ی خورشیدی' }, keywords: ['solar panel', 'photovoltaic'] },
      { label: { en: 'Telemetry dish', fa: 'دیش تله‌متری' }, keywords: ['satellite dish', 'antenna'] },
    ],
    sources: [SOURCES.nasa3d, SOURCES.sketchfab],
    feeds: [FEEDS.nasa, FEEDS.overpass],
    agents: [
      agent('clean-energy', 'lead', 'lead', { en: 'Energy Analyst', fa: 'تحلیلگر انرژی' },
        { en: 'Smart casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('clean-energy', 'specialist', 'grid-1', { en: 'Grid Engineer', fa: 'مهندس شبکه' },
        { en: 'Smart casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Grid console', fa: 'کنسول شبکه' }, EDGE_MODEL),
      agent('clean-energy', 'specialist', 'grid-2', { en: 'Storage Engineer', fa: 'مهندس ذخیره‌سازی' },
        { en: 'Smart casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Battery array', fa: 'آرایه‌ی باتری' }, EDGE_MODEL),
      agent('clean-energy', 'specialist', 'grid-3', { en: 'Remote Sensing Analyst', fa: 'تحلیلگر سنجش از دور' },
        { en: 'Smart casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Satellite feed', fa: 'خوراک ماهواره' }, EDGE_MODEL),
    ],
  },
  {
    id: 'fintech',
    index: 8,
    name: { en: 'Finance & Blockchain', fa: 'مالی و بلاک‌چین' },
    tagline: { en: 'Fintech Floor — risk before return', fa: 'طبقه‌ی فین‌تک — ریسک پیش از بازده' },
    accent: '#22D3EE',
    props: [
      { label: { en: 'Multi-screen terminal', fa: 'ترمینال چندصفحه‌ای' }, keywords: ['trading desk', 'monitors'] },
      { label: { en: 'Ticker wall', fa: 'دیوار تیکر' }, keywords: ['stock ticker'] },
      { label: { en: 'Server node', fa: 'نود سرور' }, keywords: ['server node'] },
    ],
    sources: [SOURCES.free3d, SOURCES.sketchfab],
    feeds: [FEEDS.coinGecko, FEEDS.frankfurter],
    agents: [
      agent('fintech', 'lead', 'lead', { en: 'Quant Lead', fa: 'سرپرست کوانت' },
        { en: 'Tailored suit', fa: 'کت‌وشلوار دوخت' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('fintech', 'specialist', 'trader-1', { en: 'Market Trader', fa: 'معامله‌گر بازار' },
        { en: 'Business wear', fa: 'پوشاک رسمی' },
        { en: 'Trading desk', fa: 'میز معاملات' }, EDGE_MODEL),
      agent('fintech', 'specialist', 'trader-2', { en: 'Risk Officer', fa: 'افسر ریسک' },
        { en: 'Business wear', fa: 'پوشاک رسمی' },
        { en: 'Risk wall', fa: 'دیوار ریسک' }, EDGE_REASONER),
      agent('fintech', 'specialist', 'trader-3', { en: 'On-chain Analyst', fa: 'تحلیلگر آن‌چین' },
        { en: 'Business wear', fa: 'پوشاک رسمی' },
        { en: 'Node bay', fa: 'غرفه‌ی نود' }, EDGE_MODEL),
    ],
  },
  {
    id: 'architecture',
    index: 9,
    name: { en: 'Construction & Engineering', fa: 'ساخت و مهندسی' },
    tagline: { en: 'Architecture Studio — buildable by design', fa: 'استودیو معماری — قابل ساخت از ابتدا' },
    accent: '#FBBF24',
    props: [
      { label: { en: 'Drafting table', fa: 'میز نقشه‌کشی' }, keywords: ['drafting table'] },
      { label: { en: 'Building massing model', fa: 'ماکت حجمی ساختمان' }, keywords: ['architectural model', 'building'] },
      { label: { en: 'Structural beam', fa: 'تیر سازه‌ای' }, keywords: ['steel beam', 'truss'] },
    ],
    sources: [SOURCES.bimobject, SOURCES.sketchfab],
    feeds: [FEEDS.overpass],
    agents: [
      agent('architecture', 'lead', 'lead', { en: 'Lead Architect', fa: 'معمار ارشد' },
        { en: 'Business casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('architecture', 'specialist', 'draft-1', { en: 'Draftsperson', fa: 'نقشه‌کش' },
        { en: 'Business casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Drafting table', fa: 'میز نقشه‌کشی' }, EDGE_MODEL),
      agent('architecture', 'specialist', 'draft-2', { en: 'Structural Engineer', fa: 'مهندس سازه' },
        { en: 'Business casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Beam jig', fa: 'قالب تیر' }, EDGE_MODEL),
      agent('architecture', 'specialist', 'draft-3', { en: 'GIS Analyst', fa: 'تحلیلگر GIS' },
        { en: 'Business casual', fa: 'پوشش نیمه‌رسمی' },
        { en: 'Site map table', fa: 'میز نقشه‌ی سایت' }, EDGE_MODEL),
    ],
  },
  {
    id: 'fulfillment',
    index: 10,
    name: { en: 'Commerce & Logistics', fa: 'تجارت و لجستیک' },
    tagline: { en: 'Automated Fulfillment — ship today', fa: 'تحویل خودکار — امروز ارسال کن' },
    accent: '#FB923C',
    props: [
      { label: { en: 'Forklift', fa: 'لیفتراک' }, keywords: ['forklift'] },
      { label: { en: 'Warehouse shelving', fa: 'قفسه‌ی انبار' }, keywords: ['warehouse shelving'] },
      { label: { en: 'Pallet stack', fa: 'پالت' }, keywords: ['pallet'] },
    ],
    sources: [SOURCES.polyPizza, SOURCES.sketchfab],
    feeds: [FEEDS.nominatim],
    agents: [
      agent('fulfillment', 'lead', 'lead', { en: 'Logistics Manager', fa: 'مدیر لجستیک' },
        { en: 'Operator uniform', fa: 'یونیفرم عملیات' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('fulfillment', 'specialist', 'operator-1', { en: 'Warehouse Operator', fa: 'اپراتور انبار' },
        { en: 'Operator uniform', fa: 'یونیفرم عملیات' },
        { en: 'Forklift bay', fa: 'غرفه‌ی لیفتراک' }, EDGE_MODEL),
      agent('fulfillment', 'specialist', 'operator-2', { en: 'Route Planner', fa: 'برنامه‌ریز مسیر' },
        { en: 'Operator uniform', fa: 'یونیفرم عملیات' },
        { en: 'Map table', fa: 'میز نقشه' }, EDGE_MODEL),
      agent('fulfillment', 'specialist', 'operator-3', { en: 'AGV Supervisor', fa: 'سرپرست AGV' },
        { en: 'Operator uniform', fa: 'یونیفرم عملیات' },
        { en: 'AGV lane', fa: 'خط AGV' }, EDGE_MODEL),
    ],
  },
  {
    id: 'learning',
    index: 11,
    name: { en: 'Education & Training', fa: 'آموزش و پرورش' },
    tagline: { en: 'Learning Center — teach by building', fa: 'مرکز یادگیری — با ساختن بیاموز' },
    accent: '#818CF8',
    props: [
      { label: { en: 'Smartboard', fa: 'تخته‌ی هوشمند' }, keywords: ['smartboard', 'whiteboard'] },
      { label: { en: 'Modular desks', fa: 'میزهای ماژولار' }, keywords: ['classroom desk'] },
      { label: { en: 'Holographic globe', fa: 'کره‌ی هولوگرافیک' }, keywords: ['globe'] },
    ],
    sources: [SOURCES.sketchfab, SOURCES.free3d],
    feeds: [FEEDS.wikipedia, FEEDS.arxiv],
    agents: [
      agent('learning', 'lead', 'lead', { en: 'Lead Educator', fa: 'مربی ارشد' },
        { en: 'Academic attire', fa: 'پوشش دانشگاهی' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('learning', 'specialist', 'tutor-1', { en: 'Curriculum Tutor', fa: 'مربی برنامه‌ی درسی' },
        { en: 'Academic attire', fa: 'پوشش دانشگاهی' },
        { en: 'Smartboard', fa: 'تخته‌ی هوشمند' }, EDGE_MODEL),
      agent('learning', 'specialist', 'tutor-2', { en: 'Research Librarian', fa: 'کتابدار پژوهشی' },
        { en: 'Academic attire', fa: 'پوشش دانشگاهی' },
        { en: 'Shelves', fa: 'قفسه‌ها' }, EDGE_MODEL),
      agent('learning', 'specialist', 'tutor-3', { en: 'Assessment Designer', fa: 'طراح ارزشیابی' },
        { en: 'Academic attire', fa: 'پوشش دانشگاهی' },
        { en: 'Study ring', fa: 'حلقه‌ی مطالعه' }, EDGE_MODEL),
    ],
  },
  {
    id: 'robotics',
    index: 12,
    name: { en: 'AI & Robotics', fa: 'هوش مصنوعی و رباتیک' },
    tagline: { en: 'Robotics R&D — hardware meets weights', fa: 'تحقیق رباتیک — سخت‌افزار در برابر وزن‌ها' },
    accent: '#F472B6',
    props: [
      { label: { en: 'Bipedal prototype', fa: 'پروتوتایپ دوپا' }, keywords: ['bipedal robot', 'humanoid'] },
      { label: { en: 'Servo test rig', fa: 'ریگ تست سروو' }, keywords: ['servo', 'actuator'] },
      { label: { en: 'Neural visualizer', fa: 'بصری‌ساز شبکه‌ی عصبی' }, keywords: ['neural network', 'hologram'] },
    ],
    sources: [SOURCES.thingiverse, SOURCES.polyPizza],
    feeds: [FEEDS.hfHub],
    agents: [
      agent('robotics', 'lead', 'lead', { en: 'AI Lead', fa: 'سرپرست هوش مصنوعی' },
        { en: 'Anti-static lab coat', fa: 'روپوش آنتی‌استاتیک' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('robotics', 'specialist', 'roboticist-1', { en: 'Roboticist', fa: 'رباتیک‌کار' },
        { en: 'Anti-static lab coat', fa: 'روپوش آنتی‌استاتیک' },
        { en: 'Servo rig', fa: 'ریگ سروو' }, EDGE_MODEL),
      agent('robotics', 'specialist', 'roboticist-2', { en: 'Perception Engineer', fa: 'مهندس ادراک' },
        { en: 'Anti-static lab coat', fa: 'روپوش آنتی‌استاتیک' },
        { en: 'Sensor gantry', fa: 'گنتری سنسور' }, EDGE_MODEL),
      agent('robotics', 'specialist', 'roboticist-3', { en: 'Model Evaluator', fa: 'ارزیاب مدل' },
        { en: 'Anti-static lab coat', fa: 'روپوش آنتی‌استاتیک' },
        { en: 'Weights terminal', fa: 'ترمینال وزن‌ها' }, EDGE_REASONER),
    ],
  },
  {
    id: 'treasury',
    index: 13,
    name: { en: "Sohrab's Treasury", fa: 'خزانه‌ی سهراب' },
    tagline: { en: 'Shared Financial Office — every room pays here', fa: 'دفتر مالی مشترک — همه‌ی اتاق‌ها اینجا تسویه می‌کنند' },
    accent: '#D4AF37',
    props: [
      { label: { en: 'Mahogany accounting desk', fa: 'میز حسابداری ماهون' }, keywords: ['vintage desk', 'mahogany'] },
      { label: { en: 'Leather ledger', fa: 'دفتر چرمی' }, keywords: ['ledger', 'old book'] },
      { label: { en: 'Vintage scale', fa: 'ترازوی قدیمی' }, keywords: ['balance scale'] },
    ],
    sources: [SOURCES.sketchfab, SOURCES.polyHaven],
    feeds: [FEEDS.gemini, FEEDS.frankfurter],
    agents: [
      agent('treasury', 'lead', 'sohrab', { en: 'Head Accountant', fa: 'حسابدار ارشد' },
        { en: 'Vintage suit', fa: 'کت‌وشلوار کلاسیک' },
        { en: 'Entrance threshold', fa: 'آستانه‌ی ورودی' }, LEAD_MODEL),
      agent('treasury', 'specialist', 'clerk-1', { en: 'Ledger Clerk', fa: 'کارمند دفتر' },
        { en: 'Vintage suit', fa: 'کت‌وشلوار کلاسیک' },
        { en: 'Ledger desk', fa: 'میز دفتر' }, EDGE_MODEL),
      agent('treasury', 'specialist', 'clerk-2', { en: 'Reconciliation Analyst', fa: 'تحلیلگر تطبیق' },
        { en: 'Vintage suit', fa: 'کت‌وشلوار کلاسیک' },
        { en: 'Scale table', fa: 'میز ترازو' }, EDGE_REASONER),
      agent('treasury', 'specialist', 'clerk-3', { en: 'FX Clerk', fa: 'کارمند ارز' },
        { en: 'Vintage suit', fa: 'کت‌وشلوار کلاسیک' },
        { en: 'Rate board', fa: 'تخته‌ی نرخ' }, EDGE_MODEL),
    ],
  },
];

export const PETROS_AGENTS: AgentSpec[] = PETROS_ROOMS.flatMap((room) => room.agents);

export const TOTAL_ROOMS = PETROS_ROOMS.length;
export const TOTAL_AGENTS = PETROS_AGENTS.length;

export function getRoom(id: RoomId): RoomSpec {
  const room = PETROS_ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`Unknown PETROS room: ${id}`);
  return room;
}

export function getLeadAgent(room: RoomSpec): AgentSpec {
  return room.agents[0];
}

export function getSpecialists(room: RoomSpec): AgentSpec[] {
  return room.agents.slice(1);
}

/** Every feed referenced by the swarm, de-duplicated, in registry order. */
export const ROOM_FEEDS: FeedSpec[] = Array.from(
  new Map(PETROS_ROOMS.flatMap((room) => room.feeds).map((feed) => [feed.id, feed])).values(),
);

export function feedsForRoom(id: RoomId): FeedSpec[] {
  return getRoom(id).feeds;
}

/** CC-BY sources that legally require an in-product credit line. */
export function attributionSources(): Array<AssetSource & { roomIds: RoomId[] }> {
  const byRepo = new Map<string, AssetSource & { roomIds: RoomId[] }>();
  for (const room of PETROS_ROOMS) {
    for (const source of room.sources) {
      if (!source.attributionRequired) continue;
      const existing = byRepo.get(source.repository);
      if (existing) existing.roomIds.push(room.id);
      else byRepo.set(source.repository, { ...source, roomIds: [room.id] });
    }
  }
  return Array.from(byRepo.values());
}

export const ROOM_CODES: Record<RoomId, string> = PETROS_ROOMS.reduce(
  (acc, room) => {
    acc[room.id] = `R${String(room.index).padStart(2, '0')}`;
    return acc;
  },
  {} as Record<RoomId, string>,
);
