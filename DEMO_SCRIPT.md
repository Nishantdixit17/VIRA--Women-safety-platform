# VIRA — 2-Minute SIH Judge Demo Script

> **Tagline**: *"Don't just detect danger. Predict it. Explain it. Prevent it."*

---

### 0:00 – 0:20 | The Hook & Landing Page (`/`)
- **Action**: Open `http://localhost:3000`. Point to the hero tagline, the Quick-Start Safe Journey Planner card, and the 3-card preview row (Live Safety Score, Explainable Red-Zone Advisory, and Animated Siren SOS button).
- **What to say**:
  *"Standard navigation apps tell a woman the fastest route home, but they don't tell her that the fastest shortcut cuts through an underpass with two broken streetlights, low late-night footfall, and 6 verified harassment reports. And traditional safety apps only help after she presses an SOS button. Vira is our predictive, explainable, privacy-first safety intelligence layer."*

---

### 0:20 – 0:50 | Predict & Explain: Safety Discovery Map (`/explore` & `/places/[slug]`)
- **Action**: Click **User Login**, use the **One-Tap Demo Commuter** button (`ananya@vira.safety`), and land on `/explore`. Drag the **6:00 PM to 2:00 AM Time Window Slider** from `6:00 PM` to `11:00 PM`. Click **Minto Bridge Underpass Service Corridor**.
- **What to say**:
  *"Watch how road-segment risk zones resize dynamically as we move the slider from 6 PM to 11 PM. We never label entire neighborhoods permanently dangerous. When I click Minto Bridge Underpass, Vira explains WHY the risk score is 84/100 tonight: 28/100 street lighting, 13 corroborated reports, low pedestrian footfall after 9:30 PM, and emergency help 1.1 km away."*

---

### 0:50 – 1:20 | Prevent & Protect: AI Safe Journey Planner (`/planner`) & Live Journey (`/journey`)
- **Action**: Click **Safe Planner** (`/planner`). Show the **Safest**, **Balanced**, and **Fastest** route cards between *Connaught Place Inner Circle* and *Hauz Khas Metro Station*. Click **Narrate Aloud with Vira**, then click **Start Monitored Journey** to open `/journey`. Click **Simulate Route Deviation Prompt**.
- **What to say**:
  *"Our AI Safe Journey Planner compares Fastest, Balanced, and Safest routes using human-readable place names—never raw coordinates. The Safest Route adds just 4 minutes to raise safety from 42/100 to 95/100 and passes 4 verified 24x7 Safe Havens. During the journey, if the cab deviates off-route, Vira asks 'Your route changed. Are you okay?' with a 10-second auto-escalation countdown."*

---

### 1:20 – 1:45 | Vira 3D Voice Companion, Multilingual Distress & Silent SOS
- **Action**: Open **Talk to Vira 3D** in the bottom right. Show the 3D companion breathing, blinking, and tracking the cursor. Click the **"I feel unsafe"** quick chip (or type *"Mujhe dar lag raha hai"*). Show the instant distress response, 5-second SOS countdown, and cancel it by clicking **Cancel — I Am Safe**. Mention triple-key Silent SOS (`S - S - S`).
- **What to say**:
  *"Our 3D voice companion Vira supports English, Hindi, and Bengali. Her client-side distress detector triggers before any network round-trip—providing calm reassurance, naming the nearest Safe Haven 140m away, and starting a 5-second cancelable SOS countdown. Women can also trigger a completely silent SOS anytime by pressing any key three times."*

---

### 1:45 – 2:00 | SHA-256 Evidence Vault (`/evidence`) & Authority Desk (`/admin`)
- **Action**: Open `/evidence` and click **Simulate Tampering** then **Restore Valid Hash Chain**. Open `/admin`, switch between **Police**, **Municipal**, and **University** views, and broadcast a live advisory.
- **What to say**:
  *"Every SOS, route deviation, and check-in is cryptographically chained in a SHA-256 Evidence Vault that detects any tampering. Finally, our Institutional Dashboard gives Police, Municipal lighting teams, and University proctors actionable patrol recommendations and live advisory broadcasting."*
