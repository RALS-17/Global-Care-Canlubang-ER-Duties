# ER Duty Board – City General Hospital

Live digital signage for the Emergency Room showing:

- **Nurse on Duty** (multiple names)
- **ROD on Deck** (multiple residents)
- 3-cycle shift schedule: **6-2**, **2-10**, **10-6**
- Auto-detects current shift based on time
- Video ad cycling in the main area
- iOS Blue + Green + White theme

Perfect for 55-inch (or larger) Smart TVs.

---

## Quick Start

```bash
cd er-duty-board
npm install
npm run dev
```

Open the local URL (usually http://localhost:5173) in your browser.

For production:

```bash
npm run build
npm run preview
```

Then deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## How to Update Staff

Edit the file:

```
src/data/staff.ts
```

Change the names under each shift (`6-2`, `2-10`, `10-6`).  
The screen will automatically show the correct list for the current time.

---

## How to Change Videos

Edit `src/components/VideoAds.tsx` and replace the `VIDEO_SOURCES` array with your own video URLs (or put `.mp4` files in `/public/ads/` and reference them as `/ads/yourvideo.mp4`).

---

## Smart TV Usage

1. Deploy the built site (Vercel is free and easiest).
2. On the Smart TV open the browser.
3. Go to your deployed URL.
4. Enter fullscreen mode.

The layout is optimized for large screens (1080p and 4K).

---

## Project Structure

```
src/
├── components/
│   ├── Header.tsx
│   ├── CurrentShiftBanner.tsx
│   ├── StaffPanel.tsx
│   ├── VideoAds.tsx
│   └── FooterSchedule.tsx
├── data/
│   └── staff.ts          ← Edit names here
├── hooks/
│   ├── useCurrentShift.ts
│   └── useClock.ts
├── types/
│   └── index.ts
├── App.tsx
└── App.css               ← All styling
```

---

Made for hospital ER digital signage.
