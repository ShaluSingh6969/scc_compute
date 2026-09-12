# SmartCityCloud Figma Design Spec

This file captures the UI layout, components, colors, spacing, and interactions for the SmartCityCloud telemetry dashboard.

## Pages

- Login Screen
- Dashboard Screen

---

## 1. Login Screen

### Frame

- Name: `Login / Sign In`
- Size: `1440 x 1024`
- Layout: center-aligned card on a soft background

### Background

- Fill: `#E8F3E9`
- Gradient overlay: subtle radial green highlights in corners

### Main card

- Width: `420px`
- Padding: `32px`
- Radius: `28px`
- Fill: `#FFFFFF`
- Border: `1px solid rgba(148, 210, 155, 0.2)`
- Shadow: `0 32px 60px rgba(20, 53, 28, 0.12)`

### Header section

- Eyebrow text: `SmartCityCloud`
  - Font: Inter, Bold, 12px
  - Color: `#367244`
  - Letter spacing: `0.18em`

- Title: `Secure Login`
  - Font: Inter, Bold, 40px
  - Color: `#1C4923`

- Description: `Sign in to manage telemetry uploads, analytics, and compute jobs.`
  - Font: Inter, Regular, 16px
  - Color: `#596F56`

### Form fields

- Label font: Inter, Bold, 14px, `#2B4B2E`
- Input fill: `#F7FAF7`
- Input border: `1px solid rgba(143, 195, 144, 0.45)`
- Input radius: `16px`
- Input padding: `16px`
- Input height: `52px`

### Primary button

- Text: `Sign in`
- Width: `100%`
- Height: `52px`
- Fill: linear gradient `#2C7A39` ➜ `#66B354`
- Text color: `#FFFFFF`
- Radius: `18px`

### Footer note

- Text: `Use admin / 123456 for initial access.`
- Font: Inter, Regular, 14px, `#4A6650`

### Error state

- Text color: `#962626`
- Font weight: `700`

### Interaction

- On submit: POST to `/login`
- On success: redirect to `/`
- On failure: show inline error text

---

## 2. Dashboard Screen

### Frame

- Name: `Dashboard`
- Size: `1440 x 1600`
- Layout: single column centered with grouped cards

### Global page shell

- Padding: `20px`
- Max width: `1480px`
- Background: `#E8F3E9`

### Topbar

- Container fill: `rgba(255, 255, 255, 0.95)`
- Border radius: `26px`
- Border: `1px solid rgba(165, 209, 159, 0.35)`
- Shadow: `0 24px 42px rgba(30, 79, 34, 0.08)`
- Padding: `22px 24px`
- Layout: horizontal space-between

#### Topbar left

- Eyebrow: `SmartCityCloud`
- Title: `Sensor Evaluation Dashboard`
- Subtitle copy: `Analyze your sensor recordings, identify performance trends, and surface anomaly insights.`

#### Topbar right

- Buttons: `Reload Streams`, `Logout`
- Button styles:
  - Secondary button fill: `#FFFFFF`
  - Border: `1px solid rgba(88, 150, 95, 0.22)`
  - Radius: `18px`

### Upload + filter block

- Container: `control-panel unified-panel`
- Columns: `minmax(340px, 1.4fr)` and `minmax(300px, 0.9fr)`
- Gap: `20px`

#### Upload section

- Card fill: `#FFFFFF`
- Radius: `20px`
- Inner spacing: `20px`
- Title: `Upload telemetry`
- Description: `Select a CSV file containing your sensor telemetry data.`
- File input: styled field with `Upload CSV` button
- Button: `Upload CSV`

#### Filter summary card

- Fill: `rgba(241, 249, 241, 0.95)`
- Border: `1px solid rgba(140, 195, 132, 0.24)`
- Padding: `18px`
- Title: `Analysis filter`
- Summary text line
- `Edit filter` button
- Stream count text below summary

### Filter modal

- Overlay fill: `rgba(25, 48, 24, 0.4)`
- Content width: `680px`
- Card radius: `24px`
- Header: label + close button
- Body: form fields for parameter filter, detection method, and sliders
- Actions: Cancel + Save filters

### Action row

- Buttons: `Run Compute Task`, `Save Results`
- Gap: `14px`
- Layout: horizontal on desktop

### Summary stats row

- 3 stat cards
- Each card content: label + value
- Values: `Total readings`, `Anomaly rate`, `Safety status`

### Tabs row

- Buttons: `Overview`, `Analytics`, `Insights`
- Active tab underline or fill state

### Overview tab

- Left card: `Operational telemetry overview`
- Right card: `Anomaly distribution` chart

### Analytics tab

- Two cards side by side
  - `Parameter performance` chart
  - `Telemetry timeline` chart

### Insights tab

- Large detail panel
- Default briefing text when no results loaded
- After compute: anomaly, performance, and issue detail cards

### Chart styling

- Use Chart.js style placeholders
- `doughnut` and `bar` colors: green palette, gray accent
- `line` charts: soft green/blue lines with transparent fill

---

## Components

### Buttons

- Primary
  - Background: `linear-gradient(135deg, #2C7A39 0%, #66B354 100%)`
  - Text: `#FFFFFF`
  - Shadow: `0 18px 32px rgba(44, 87, 42, 0.18)`
- Secondary
  - Background: `#FFFFFF`
  - Border: `1px solid rgba(88, 150, 95, 0.22)`
  - Text: `#23512D`

### Cards

- Fill: `#FFFFFF`
- Border radius: `20px`
- Border: `1px solid rgba(148, 210, 155, 0.24)`
- Shadow: `0 16px 24px rgba(81, 131, 88, 0.08)`

### Inputs

- Fill: `#F7FAF7`
- Border: `1px solid rgba(143, 195, 144, 0.45)`
- Radius: `16px`
- Height: `52px`

### Typography

- Headings: Inter, Bold
- Body: Inter, Regular
- Color palette:
  - Primary text: `#16211F`
  - Secondary text: `#526655`
  - Accent green: `#2C7A39`
  - Muted gray: `#4E6B54`

---

## Figma file structure

- Page 1: `Login`
  - Frame: `Login / Sign In`
  - Layers: Background, Login Card, Form, Buttons
- Page 2: `Dashboard`
  - Frame: `Dashboard`
  - Sections: Topbar, Upload + Filter, Action Row, Summary Stats, Tabs, Charts, Insights
- Components:
  - `Button / Primary`
  - `Button / Secondary`
  - `Input / Text Field`
  - `Card / Basic`
  - `Modal / Filter Settings`
  - `Tab / Button`

---

## Notes for Figma creation

- Use auto-layout for rows and columns.
- Use `Spacing mode: Packed` for controls and `Space between` for topbar.
- Keep consistent padding: `20px` inside cards, `24px` on topbar.
- Build the modal as an overlay group with a semi-transparent background.
- Use placeholder chart frames for `anomalyChart`, `performanceChart`, and `timelineChart`.

---

## Page export assets

- Icons: use simple geometry or Material icons for download, logout, close, and chart markers.
- Charts: use placeholder frames with gradient fills and legend labels.
- Buttons: create component variants for default/hover.

---

## Usage

Open this spec in Figma as a reference and recreate the screens using the component and frame guidelines above. If you want, I can also generate a deeper component layer structure or provide an exported `.json` layout for plugin-based import.
