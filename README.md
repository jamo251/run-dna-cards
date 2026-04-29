Run DNA Cards - README

TL;DR

Run DNA Cards is a visually rich Next.js web app that transforms your real-world GPS runs into collectible trading cards—think Pokémon meets Strava. Upload a GPX file and instantly get a shareable card featuring your run's route, auto-classified archetype, rarity tier, and RPG-style stats. Built to showcase advanced geospatial data processing, serverless PNG generation, and modern frontend UX—all with deep portfolio and product thinking.



Goals

Business Goals





Demonstrate full-stack product craftsmanship: from data parsing through advanced SVG/PNG rendering to client persistence and sharing.



Build a project that attracts recruiters, hiring managers, or technical leads seeking evidence of geospatial, React, TypeScript, and server-side image expertise.



Showcase engineering "taste" by shipping a complete, addictive, and polished end-user experience.



Stay cloud- and serverless-friendly (fully Vercel-compatible, zero external DBs or server dependencies).



Maintain rapid startup execution and a repo that someone could clone, install, and run in <10 minutes.

User Goals





Allow any runner to immortalize a GPX run as a personalized, visually compelling trading card.



Enable easy sharing to platforms like X (Twitter) and Instagram, with pre-filled captions.



Support collecting and revisiting past runs in an organized, filterable binder.



Motivate repeat use with evolution mechanics and stat-based card upgrades.



Make stat head-to-head battles between runs fun, fair, and easy to understand.

Non-Goals





There are no public user accounts, profiles, or cloud sync—cards and collections are local to your browser.



No manual stat editing—only GPX data and automatic classifiers determine stats and rarity.



No bulk import of activity history—designed for single-run uploads, real or synthetic, to keep experience focused.



User Stories

Runner / Collector:





As a runner, I want to upload a GPX file, so that I can see my run as a collectible trading card.



As a collector, I want to browse my card binder, so that I can revisit and share my favorite runs.



As a runner, I want my repeat attempts on the same course to evolve my card, so that I can track improvement and unlock rarity.



As a player, I want to battle two cards, so that I can compare my runs or challenge a friend's stats.



As a sharer, I want to export or share my card as a PNG with a ready-made caption, so that others can see and react to my achievement.

Power User:





As an optimizer, I want precise stats and route silhouettes, so that my effort and improvement are measured fairly.



As a data geek, I want to see how classification and rarity are assigned, so that I understand and trust the results.



As a design-sensitive user, I want beautiful cards that work on social platforms and look good in both the app and as exported images.



Functional Requirements





Card Generation (Priority: Highest)





GPX file upload via drag-and-drop or file picker (with extension/type validation and smooth error states).



GPX parsing for route, splits, elevation, pace, heart rate (if present).



Run type classifier with 7 archetypes.



Stat normalization (distance, elevation, pace, consistency, suffer, novelty—scored 0-100).



Rarity tier assignment (Common, Rare, Epic, Legendary).



Sharing & Download (Priority: High)





Generate trading card PNG (630x880px) server-side using Satori + resvg-js.



Download card button (with proper filename).



Share card modal: X/Instagram share, clipboard copy, fallback flows, pre-filled editable captions (max 280 chars).



Collection Binder (Priority: High)





Local IndexedDB persistence for every card (full card data, not blobs).



/collection route with responsive, filterable grid view.



Full-size card modal and overlay badges for evolutions.



Evolution Mechanic (Priority: Medium)





Unique route fingerprinting (djb2 hash of downsampled coordinates).



Evolve card on stat improvement, counting total evolutions per route.



Evolution badges (3 runs = Evolved, 10 runs = Final Form), in-card banners and visual pinning in the binder.



Card Battle Mode (Priority: Medium)





/battle route: select any two cards and battle all 6 stats.



Animated, sequential stat reveal with clear overall winner and tiebreaker display (rarity, evolution, seniority).



User Experience

Entry Point & First-Time User Experience





Landing page with title, brand, and a welcoming hero copy—explains concept instantly.



Prominent drag-and-drop zone for GPX files, with accessible click-to-browse alternative.



Immediate feedback for invalid files, with supportive inline messaging.



Minimal friction: No login, no registration, no uploading personal data to a server.

Core Experience





Step 1: User selects or drags a GPX file onto the upload zone.





UI: visually responds to both drag and click, validates file extension/type.



On error: clear, actionable error message (e.g., "Please upload a valid .gpx file exported from Strava or Garmin.").



Step 2: Upon upload, file is parsed on the client for stats, splits, and coordinates.





If parsing fails: error is shown, user can retry.



Step 3: App classifies run type, normalizes stats, assigns rarity tier, and derives a smart run name.





All calculations are fully automated—no manual tuning needed.



Step 4: Card is rendered instantly with silhouette, stats, name, badges, and rarity border.



Step 5: User can download the PNG, share to X/Instagram, copy to clipboard, or save to their local card binder.



Step 6: Binder at /collection allows browsing/filtering all saved cards, opening full-size previews, and displays evolution badges.



Step 7: Re-uploading an improved run on a known route triggers the evolution mechanic and a celebratory banner.



Step 8: /battle enables animated, head-to-head stat fights between any two cards, with clear winner highlights and tiebreaker logic.



Step 9: All flows provide smooth empty states and contextual actions (e.g., if no cards yet, prompt to upload a run).

Advanced Features & Edge Cases





Robust handling of synthetic or incomplete GPX (helpful messaging).



Clipboard and share fallbacks on browsers lacking Web Share or ClipboardItem support.



Tamper-safe: Stats and rarity derive only from GPX + deterministic logic; no user overrides to ensure "earned" status.



Evolution mechanic always picks the canonical card (oldest on route), so no duplication issues from previous versions.

UI/UX Highlights





Universal dark mode with strong foreground contrast (#1a1a2e background, whites/accents for content).



Responsiveness: binder, upload, and battle modes all adapt gracefully from mobile to desktop.



Touch and keyboard navigable throughout—modals, drag/drop, grid, and selectors.



All rarity/achievement badges use SVG gradients or effects compatible with Satori server rendering.



Narrative

Sarah, a dedicated runner, is always looking for new ways to relive her favorite routes and showcase her progress. She exports a GPX file from her latest trail run and drags it into Run DNA Cards. Instantly, she's greeted by a beautiful trading card—her custom route silhouette, unique run type, and a set of RPG-inspired stats. She shares the image to Instagram, proudly displaying her Legendary-tier achievement. Over the next few weeks, Sarah keeps running the same course, uploading new GPX files—her card evolves, badges update, and she climbs from "Base" to "Final Form". Curious how she stacks up, Sarah visits the battle mode, facing her improved self against an old race on a different route. The step-by-step stat reveal is fun, competitive, and motivating. Her binder grows, now a gallery of hard-earned memories—each captured as a collectible artifact to share, compare, and cherish.



Features

Run DNA Cards delivers a polished, end-to-end collectible experience:





Card Generation: Upload a GPX and receive instant, visually rich cards. Each card displays your route as a unique silhouette, classifies your run into one of 7 archetypes (Sprinter, Mountaineer, etc.), assigns a rarity tier (Common → Legendary), and scores 6 normalized stats.



Share & Download: Seamless one-click PNG export (630x880px) with Satori server-side rendering. Integrated sharing flows—Web Share and Clipboard APIs support direct posting to X and Instagram, including pre-filled, platform-optimized captions under 280 characters. Clipboard fallback ensures you can always share, even without API support.



Collection Binder: Every saved card lives in an IndexedDB-backed binder at /collection. Cards are organized in a responsive grid, filterable by type or rarity, with full-size modals for closer inspection and shareouts.



Evolution Mechanic: Runs on the same route fingerprint (via djb2 hash of downsampled coordinates) enable card evolution when at least one stat improves. After 3 evolutions, cards gain "Evolved" status; at 10, they reach "Final Form"—each marked with animated badges and celebratory banners.



Card Battle Mode: In /battle, select or randomly match two cards from your binder. Compare head-to-head on all 6 stats, watch sequential animated reveals, and let rarity/evolution/seniority decide tiebreakers. Rematch to fuel friendly stats rivalry.



How It Works

An end-to-end data flow for every card:





Upload: User uploads a real GPX file from Strava, Garmin, or any supported device.



Parse: The GPX is parsed into route coordinates, elevation, pace splits, and optionally heart rate (via @tmcw/togeojson and custom logic).



Classify: The run is automatically classified into one of 7 archetypes using prioritized, deterministic thresholds on distance, elevation, and consistency.



Score: Six core stats (distance, elevation, pace, consistency, suffer, novelty) are normalized to a 0–100 scale. Rarity tier is assigned based on the highest stat.



Name: Smart naming derives either from filename or a descriptive fallback (e.g., "Evening Mountaineer").



Render: All this feeds into the RunCard component, which renders a card with route silhouette, badges, stats, and rarity border.



Save/Evolve: When the card is displayed, its downsampled coordinates are fingerprinted (djb2 hash). If no existing card matches, it is saved to IndexedDB as a new entry. If one does (same route), the app checks stat improvement: if any stat is higher, the card evolves (stats/rarity updated, evolutionCount incremented).



Share/Download: Users can download the card as a PNG (server-side Satori), share to X/Instagram, or copy to clipboard. Caption construction ensures easy, meaningful sharing for every platform—always within the 280-char limit.



Binder/Battle: The /collection route aggregates all saved cards in a filterable grid. The /battle route lets two cards go head-to-head with animated stat reveals and tiebreaker logic.



Run Types







Archetype



Key Criteria





Negative Splitter



Second half avg pace ≥ 0.15 min/km faster than first half





Metronome



At least 3 splits, pace std dev ≤ 0.12 min/km





Sprinter



≤5 km total, pace std dev ≥ 0.45 min/km, elevation gain/km <20





Heartbreaker



HR up ≥8bpm in second half, pace does not improve (requires HR)





Mountaineer



Elevation gain per km >20m/km





Grinder



Duration >60 min, pace 4.5-7 min/km, std dev ≤ 0.35





Explorer



Fallback for runs not matching any above

Priority (highest first): Negative Splitter, Metronome, Sprinter, Heartbreaker, Mountaineer, Grinder, Explorer.



Rarity Tiers

Cards are assigned a rarity based on their top stat:







Tier



Assignment Logic



Visual Treatment





Legendary



Any stat ≥90



Gold border, animated foil effect (SVG pattern)





Epic



Any stat ≥75



Rainbow/foil border, holographic badge





Rare



Any stat ≥55



Silver/blue border, subtle sparkle





Common



All stats <55



Standard black border

Holographic/foil effects are implemented as SVG patterns and gradients so exported Satori PNGs look identical to live rendered cards—no unsupported CSS or pseudo-elements.



Tech Stack





Next.js 16 (App Router): Modern React, SSR and API routes in one. Chosen for Vercel compatibility and ecosystem fit.



TypeScript: End-to-end strong typing, from data pipeline to component props and state.



Tailwind v4: Utility-first CSS for rapid theming, dark mode, and responsive grid.



Turbopack: Fast dev server, rapid build.



Vercel Free Tier: Zero-config deploy, instant HTTPS, serverless API endpoints.



@tmcw/togeojson: State-of-the-art GPX → GeoJSON parser for distance/splits/elevation extraction.



SVG (no D3): Custom math for route path rendering (no heavy D3 bundle, pure SVG path logic).



Satori + @resvg/resvg-js: Server-side PNGs—Satori is stateless, fast (<3s), and Vercel/serverless-native. Chosen over Puppeteer for reliability and rapid cold starts.



IndexedDB: Blazing-fast, async local storage for card collections—uses in-house wrapper, no 3rd-party library.



djb2 Hashing: Efficient, collision-resistant route fingerprinting from downsampled coordinates.



Web Share API + Clipboard API: One-click native sharing (X, Instagram), with graceful fallback to copy-to-clipboard or raw caption.



Project Structure

Data Pipeline





src/lib/gpxParser.ts — GPX XML → stats & route. Uses @tmcw/togeojson.



src/lib/classifier.ts — Classifies runs into archetypes based on parsed stats.



src/lib/scorer.ts — Normalizes stats and assigns rarity.



src/lib/coordinatesToPath.ts — Downsample & normalize coordinates into SVG path d for both live card and PNG.

Theming & Naming





src/lib/cardTheme.ts — Centralized color/gradient map for rarity and run-type badges/borders.



src/lib/runName.ts — Derives display name from filename and run type.

Persistence & Evolution





src/lib/cardStorage.ts — IndexedDB wrapper: saveCard, getAllCards, count, getRouteFingerprint, evolveCard.



src/lib/evolutionConfig.ts — Exports evolution thresholds, stage logic.

Sharing & Captions





src/lib/shareCaption.ts — Caption generator that formats run info for X/Instagram, under 280 chars.



src/app/components/ShareModal.tsx — Modal with PNG preview and all share/copy flows.

Battle Engine





src/lib/battleEngine.ts — Defines STAT_KEYS, battleStat, battleAll, and tiebreakers.

Card UI





src/app/components/RunCard.tsx — Main card. 360x504, accent theme, all stats and badges.



src/app/components/RouteMap.tsx — Renders route path SVG within card frame.



src/app/components/EvolutionBadge.tsx — Small badge for evolved/final cards.

Server-side PNG





src/app/api/generate-card/route.tsx — POST endpoint, Satori+resvg server rendering, fonts fetched on demand.

App Routes





src/app/page.tsx — Home: upload, nav, and branding.



src/app/collection/page.tsx — Binder: filterable grid, modal, evolution badges.



src/app/battle/page.tsx — Battle mode: selector panels, animated reveal, winner.



src/app/card-preview/page.tsx — Static snapshot for dev/design.

Uploader Orchestration





src/app/components/GpxUploader.tsx — Links all stages: upload → parse → classify → score → name → render → save/evolve → share/download.



Getting Started

Prerequisites





Node.js v18+ required.



Any valid GPX file (exported from Strava, Garmin, COROS, etc.—not a synthetic or hand-edited file).

Quickstart

git clone https://github.com/yourusername/run-dna-cards.git
cd run-dna-cards
npm install
npm run dev

Visit http://localhost:3000, or http://localhost:3000/card-preview for a design preview without uploading.

Recommended: Test with real activities from your tracker/platform. Cards depend on real-world pace/splits, so synthetic files may not showcase the full UX.



Acknowledgements & Portfolio Notes

This project was built as an open-source portfolio demo to highlight hands-on skills with GPX/geospatial data, run classification algorithms, advanced SVG/PNG rendering (Satori/Resvg), and UX-focused app development.
Product, design, logic, and code shipped in 12 focused daily sessions leveraging Claude Code as the primary build, ideation, and review environment.
Run DNA Cards is designed to demonstrate the "full-stack product sense" that makes engineering teams and design stakeholders confident you can ship robust, delightful systems—end to end, pixel to byte.
No apologies—just proud engineering.



Goals

Business Goals





Ship a production-quality, full-stack product for portfolio and demonstration use.



Highlight unique geospatial/data visualization and server-side rendering skills for technical recruiters and hiring managers.



Demonstrate rapid, iterative development and user-centric feature design.



Validate all app infrastructure against Vercel/serverless deployment constraints.



Maximize user delight, shareability, and engagement with your own running history.

User Goals





Upload and immortalize a run with one click—no manual metadata or hunting for split stats.



Share run achievements seamlessly to social media, maximizing positive feedback and motivation.



Collect, revisit, and visually explore running progress in a dynamic card binder.



See improvement rewarded through card evolution and stat upgrades.



Compare and celebrate performance across different routes via fun interactive battles.

Non-Goals





No public user accounts or cloud sync—cards and history are browser-local.



No social networking, messaging, or follower features.



No paid features, monetized sharing, or pro tiers—this is intentionally a free, portfolio-first build.



User Stories

Runner





As a runner, I want to upload my GPX, so that I can see a beautiful, meaningful card of my run.



As a runner, I want my best runs and improvements to be visible, so that I can track my journey and progress.



As a runner, I want to share my accomplishments easily to social media, so that I can inspire my network.

Collector





As a collector, I want to browse all my saved cards, so that I can revisit and compare them by type and rarity.



As a collector, I want badges and evolution upgrades for repeat runs, so that my achievements feel tangible and earned.

Power User





As a stats-oriented user, I want quick, clear stats and battle mode, so that I can compare runs at a glance and enjoy competition.



Functional Requirements





GPX Parsing & Card Generation (Priority: Must-have)





GPX upload (drag-drop + click).



Client-side parsing of GPX for route, elevation, pace, splits, heart rate.



Run type classifier (7 archetypes).



Stat normalization (distance, elevation, pace, consistency, suffer, novelty).



Rarity tier assignment.



Card Rendering & Theming (Priority: Must-have)





SVG route rendering within card.



Responsive, theme-driven design.



Color, rarity, and badge mapping from run type/stats.



Collection & Persistence (Priority: Must-have)





IndexedDB-backed storage for cards.



/collection grid with filters, sorting, and modals.



Evolution Mechanic (Priority: Should-have)





Route fingerprinting (djb2 over downsampled track).



Evolution gating (stat improvement required).



Evolution stage display and badge overlays.



Server-side PNG & Sharing (Priority: Should-have)





/api/generate-card endpoint (Satori SVG → PNG).



Download, Share (Web Share, Clipboard API), and prefilled captions.



Card Battle (Priority: Nice-to-have)





/battle page: two-card selector, 6-stat head-to-head, animated reveal, winner/tiebreaker logic.



User Experience

Entry Point





User visits landing page, instantly sees what the app does (branding, hero, simple explainers).



First thing visible: upload zone—drag-and-drop or click to select GPX file.

First Use





User drops file, gets instant feedback, then sees route/classification/stats/"magic moment."



Supportive errors for invalid GPX or missing data.

Binder





Navigates to /collection to view all saved runs—cards displayed in polished grid.



Filters run type/rarity, views evolution badges, can open modal with full-size card.

Sharing





Hits Share, sees both the PNG and default caption. One-click post to X/Instagram, or copies image/caption. All sharing respects character limits and mobile vs. desktop nuances.

Evolution





Uploads improved GPX for same route. If stats better: bright evolution banner, count/badge updated, saved back into binder—adds emotional "level up."

Battle





Jumps into /battle, picks any two cards, presses Battle—stat-by-stat suspenseful reveal, winner highlight, tiebreakers called out for transparency.

UX Details





Colors and gradients picked for clarity and platform parity (client + PNG).



All modals accessible via keyboard.



No-scrolling card preview in modal.



States and flows designed for clarity: loading, error, "empty binder" prompts, invalid file messaging.



Narrative

Matthew, a mid-pack marathon runner, wants to make his training stick and share it with friends not obsessed with raw data. Instead of squinting at generic pace charts, he drags his latest Strava export into Run DNA Cards. Instantly, his route pops up as an artful collectible card—showing how his effort classifies, what stats he crushed, how his rarity stacks up, and a playful run name. When he runs the same course the next week and outperforms himself, the app rewards him with a shiny evolution upgrade. At his next group run, Matthew opens his phone, launches battle mode, and pits his best sprints against his hill climb PR—each stat flipping with a crisp reveal, bragging rights settled. His social feed fills with celebratory PNGs and he feels his training finally has a story—one he controls, collects, and proudly shares.



Success Metrics

User-Centric Metrics





Number of GPX uploads and cards generated per session.



Repeat runs per user (card evolution rate).



Number of cards shared/downloaded (measured via button clicks).



Battle mode engagement (battles per user/session).



Binder completion (average cards in collection).

Business Metrics





Unique users (via local analytics or event tracking—browser only, no backend).



Portfolio repo stars/forks.



Recruiter/hiring manager mentions or inbound interest triggered by demo.



Showcase/feature acceptance in dev/design communities.

Technical Metrics





GPX parsing success rate (no unhandled errors on valid files).



Card rendering consistency (visual match between SVG and Satori PNG).



Bundled app footprint (keep under 2MB client-side).



Serverless endpoint cold start performance (<3s for PNGs via Satori).

Tracking Plan





GPX upload events



Card generation/completion events



Share/download button clicks



Card evolution triggers



Battle mode entry/completion



Technical Considerations

Technical Needs





Robust client API for file input, parsing, and local state management.



Managed IndexedDB wrapper for local card persistence.



Serverless PNG generation via Satori/resvg in a Next.js API route.



Theme and color strategy consistent between React (client) and server-rendered layouts.

Integration Points





@tmcw/togeojson for GPX ingestion.



Satori + resvg-js for stateless PNG exports (backed with Google Fonts as ArrayBuffer).



Web Share API and Clipboard API for social flows—desktop and mobile fallback logic.

Data Storage & Privacy





All run/card data stays in the browser IndexedDB; no personal info leaves the user’s device.



No accounts, no cloud sync—privacy by design.



PNGs and captions only exported via explicit user action; never saved server-side.

Scalability & Performance





Baked for Vercel/serverless—can handle many simultaneous users (stateless design).



PNG generation stateless, cold start <3s.



UI optimized for >100 cards per binder on average devices.

Potential Challenges





Browser API surface differences (Web Share, Clipboard).



var GPX source quality: rare edge cases or corrupt files need gentle error paths.



Satori feature subset—no unsupported CSS or SVG constructs in export pipeline.



IndexedDB operational quirks—defensive schema versioning and error handling.



Milestones & Sequencing

Project Estimate





Medium: 2–4 weeks from zero to launch, including testing and polish.

Team Size & Composition





Small team: 1–2 fast-moving contributors (1 full-stack engineer/designer, possibly with code/UX pair reviews).



All code, UX, and project management can be owned by a single highly skilled developer.

Suggested Phases

Phase 1: Foundation & Upload (2–3 days)





Key Deliverables: GPX upload flow, parser, raw stat extraction, on-screen output.



Dependencies: Node 18+, Next.js install.

Phase 2: Data Pipeline & Card UI (2–3 days)





Key Deliverables: Run classifier, stat normalization, rarity, initial RunCard TSX skeleton, route SVG.



Dependencies: GPX parsing working.

Phase 3: Server-side PNG & Sharing (3–4 days)





Key Deliverables: Satori endpoint, Download/Share flows, ShareModal, captions, PNG output.



Dependencies: Card UI + coordinated color tokens ready.

Phase 4: Binder, Evolution, and Battle (5–8 days)





Key Deliverables: IndexedDB wrapper, collection grid with filter/modal, evolution upgrade, card battle route + sequential stat reveal.



Dependencies: Data pipeline, card share/download flow, card UI and styles locked.



Install and run:
git clone ... && cd run-dna-cards && npm install && npm run dev



Built end-to-end as a demonstration of full-stack product mindset and a showcase for practical geospatial, stats/algorithm, and UX craft.
