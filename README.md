# suren cherkezyan — portfolio

A plain HTML/CSS/JS site with no build step, ready for GitHub Pages.

Every file sits at the top level (no folders), so you can select them all and upload in one go.

## Your GIFs

Save your matplotlib animations into this folder with exactly these names:

- `boids.gif` — boids page
- `spill-continuous.gif` — spill page, top (continuous leak)
- `spill-instant.gif` — spill page, lower (instantaneous spill)

Until they're added, those spots show the image's description instead.


## Put it online with GitHub Pages

1. Create a new repository on GitHub. Name it `YOUR-USERNAME.github.io` to get the address
   `https://YOUR-USERNAME.github.io`, or use any other name to get
   `https://YOUR-USERNAME.github.io/REPO-NAME`.
2. Click **uploading an existing file**, select every file in this folder, drop them in and commit.
   Or from a terminal:
   ```
   cd site-flat
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
- **Portrait:** add `portrait.jpg` and follow the comment in `about.html`.
- **Résumé:** the PDF includes your phone number. Remove it from the PDF, or delete the file and
  the Résumé links, if you'd rather not publish it.

## Adding a project

Copy one of the project pages (e.g. `boids.html`), change the text and images, and add a link to it in
`index.html`. Any block marked `data-boid-avoid` is steered around by the flock.

## Tuning the flock

Each area is a `<div class="flock" data-flock ...>` with a `<canvas>` inside:

- `data-count` — number of boids
- `data-origin` — `bottom` (default) or `right`: where the flock bursts out from
- `data-drift` — downward lean (0 = none), switched off once a visitor reaches the bottom
- the inline `style` (`top`, `height`, `bottom`) — where the flock lives on the page
