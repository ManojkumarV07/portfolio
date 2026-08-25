# Manoj Kumar V — Portfolio

## Run it

The site is plain HTML/CSS/JS. It needs a local web server, not a
double-click — opening `index.html` directly uses the `file://`
protocol, where the canvas cannot load the dino sprite.

From inside this folder:

    python -m http.server 8000

Then open <http://localhost:8000>

Alternatives, any one of these works:

    npx serve .
    php -S localhost:8000

Or in VS Code: install the **Live Server** extension, right-click
`index.html` → *Open with Live Server*.

## Files

    index.html                  the page
    styles.css                  your original stylesheet
    script.js                   your original script (untouched)

    assets/css/responsive.css   breakpoints, spacing, nav-landing fix
    assets/js/nav-runner.js     the dino game in the navbar
    assets/js/robot-smash.js    the robot that smashes nav links

    assets/images/opt/          responsive WebP variants (used by the page)
    assets/images/dino-sprite.png   Chromium T-Rex frames, 387 bytes
    assets/images/*.jpg|png     your original photos (sources)
    assets/*.pdf                resumes

## Tuning

Each add-on has its settings grouped at the top of the file.

**Dino game** — `assets/js/nav-runner.js`, the `CFG` block:

    wMin / wMax    how wide the strip may grow
    readyMs        how long the controls hold before a run starts
    speed0         starting pace
    px             pixel scale of the cacti and birds

**Robot** — `assets/js/robot-smash.js`, the `CFG` block:

    speed          one multiplier over every beat: walk, lift, swing
    stride         milliseconds per footstep
    minWidth       below this width the robot is skipped entirely

## Removing an add-on

Delete its `<script>` or `<link>` tag from `index.html` and delete the
file. Nothing else depends on them — `styles.css` and `script.js` keep
working on their own.

## Regenerating the images

`assets/images/opt/` holds three widths of each photo. To rebuild them
after swapping a photo, any image tool works; the sizes are 420 / 760 /
1100 for the hero and 420 / 820 / 1200 for the about portrait, saved as
WebP at quality 80–82.

## Publishing

It is a static site, so it drops straight onto GitHub Pages, Netlify or
Vercel with no build step. Push the folder and point the host at it.
