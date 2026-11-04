# AR Locals – Bookwhen Check (Chrome / Edge extension)

Lets the desk's **Check user** button read a member's Locals status from Bookwhen using the
reception PC's own Bookwhen login. No passwords are stored anywhere.

## Install (once per reception PC)
1. Copy this `extension` folder onto the PC (or download the repo ZIP from GitHub and unzip).
2. Chrome: open `chrome://extensions` · Edge: open `edge://extensions`.
3. Turn on **Developer mode** (top-right in Chrome, left sidebar in Edge).
4. Click **Load unpacked** and choose the `extension` folder.
5. Make sure Bookwhen is signed in (Leisure Team) in the same browser.
6. Reload the desk (https://sonjamesg.github.io/ar-locals-scan/) – Check user now uses the extension.

## How it works
Desk → postMessage → `desk-bridge.js` → `background.js` opens a hidden background tab at
`/customers/{id}/subscriptions`, finds the Locals subscription link, opens
`/memberships/rnxp8pcbzpii/subscriptions/{subId}`, reads LCL (h2), status (span.status) and
"Renews at", closes the tab, and replies. The desk saves it via the `save_bw_check` RPC.

If the extension isn't installed, Check user opens the Memberships page so you can check by eye.
Open in Bookwhen / Memberships buttons always stay as the manual route.
