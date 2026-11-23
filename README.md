# ONEVEA — One Layered Vision System

Marketing site for Onevea smart eyewear. Static HTML/CSS/JS, no build step.

## Pages
- `index.html`: home page with the 3D glasses hero, lens modes, pinned manifesto, core layers, light-range comparator, iris scan, specs
- `about.html`: mission, timeline, principles
- `contact.html`: enquiry form (sent through Formspree)

## Run locally
```
npx http-server -p 5173 -c-1
```
Then open http://localhost:5173

## Contact form
In `contact.html`, replace `YOUR_FORM_ID` in the form's `action` with your Formspree form ID.

## Stack
Three.js r128 (3D glasses), GSAP 3.12 + ScrollTrigger (animation), Anton + JetBrains Mono (Google Fonts). All loaded from CDNs.
