Hermatrix Asteroids Bot
=======================

This is my bot for playing the Asteroid game that was part of the hermatrix.net ARG in July 2021.

Neither the game itself, nor the server it was served on, is available anymore, so I'm making the bot public for archiving purposes.

I noticed in May of 2025 (a bit late, yes) that the game had been switched from running on the server with the browser only acting as a client to running fully in the browser, which also made the game logic public. I therefore downloaded all the relevant files from the Internet Archive (https://web.archive.org/web/20210731191800/https://hermatrix.net/asteroids/) and adapted my bot code to use this game logic instead.

The visual bot ("devbot") is available [here, via GitHub Pages](https://firetech.github.io/hermatrix-asteroids-bot/web/), or by opening `web/index.html` in your favorite web browser (after downloading the repository contents).

The non-visual bot ("nodebot") can be run with node.js using `node client.js` in this directory (after downloading the repository contents).

Copyright
---------
All code except where noted in the beginning of the file is copyright the Hermatrix authors (but may have modifications by me).
