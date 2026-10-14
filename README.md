# suren cherkezyan — portfolio

A plain HTML/CSS/JS site with no build step, ready for GitHub Pages.

```
index.html                 Work (home)
about.html                 About
projects/
  asset-matching.html      R asset-matching tool (Ministry of Infrastructure)
  spill-model.html         Random-walk contaminant spill model
  boids.html               Boids, with a live demo
assets/
  style.css                all styling
  site.js                  wave placement + the background flock
  img/                     figures
  Suren_Cherkezyan_Resume.pdf
.nojekyll                  tells GitHub Pages to serve files as-is
```

## Put it online with GitHub Pages

1. Create a new repository on GitHub. Name it `YOUR-USERNAME.github.io` to get the address
   `https://YOUR-USERNAME.github.io`, or use any other name to get
   `https://YOUR-USERNAME.github.io/REPO-NAME`.
2. Upload the contents of this folder to the repository's root (drag and drop on github.com works),
   or from a terminal:
   ```
   cd site
   git init
   git add .
   git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git
   git push -u origin main
   ```
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*,
   choose **main** and **/ (root)**, and save. The site is live within a minute or two.

## Before publishing

- **LinkedIn and GitHub links:** replace `YOUR-LINKEDIN` and `YOUR-GITHUB` in `about.html`.
- **Portrait:** add `assets/img/portrait.jpg` and follow the comment in `about.html`.
- **Résumé:** the PDF includes your phone number. Remove it from the PDF, or delete the file and
  the Résumé links, if you'd rather not publish it.

## Adding a project

Copy one of the pages in `projects/`, change the text and images, and add a link to it in
`index.html`. Any block marked `data-boid-avoid` is steered around by the flock.

## Tuning the flock

Each area is a `<div class="flock" data-flock ...>` with a `<canvas>` inside:

- `data-count` — number of boids
- `data-drift` — downward lean (0 = none), switched off once a visitor reaches the bottom
- the inline `style` (`top`, `height`, `bottom`) — where the flock lives on the page
