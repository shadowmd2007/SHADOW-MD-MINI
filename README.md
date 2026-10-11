<img width="900" height="1599" alt="1000097298" src="https://github.com/user-attachments/assets/9abd1c9f-4b66-4187-9f85-a187126e083c" />

SHADOW MD MINI A Railway-ready WhatsApp Multi-Device mini bot with an
integrated web pairing page. Branding Bot: SHADOW MD Owner: RANA
FURQAN Owner number: 923003719761 GitHub:
https://github.com/shadowmd2007/SHADOW-MD-MINI.git Channel:
Channel JID: 120363412495477805@newsletter Image:
https://i.ibb.co/LXZmrwt7/aac9612d34de.jpg Railway deployment Upload this
project to GitHub or deploy the ZIP contents to Railway. Railway detects
package.json and runs npm start. Add a Railway Volume mounted at
/app/data. Deploy. Open the Railway public domain. Enter the WhatsApp
number in international format without +. Copy the 8-character pairing code
into WhatsApp: Linked devices → Link a device → Link with phone number
instead. Why the Volume is required MongoDB is not used. WhatsApp
authentication keys must persist between restarts. Railway Volumes provide
persistent storage. The project deliberately does not use a session/ folder;
auth is stored in /app/data/shadow-auth. Environment variables Optional:
PORT — Railway normally provides this. AUTH_DIR — default
/app/data/shadow-auth. Commands The .menu contains the supplied
category/style and filters duplicate/invalid-looking entries. Core commands
include: .menu .help .ping .alive .owner .repo .channel .group .jid .url .status
The large menu is intentionally registered through one command framework
so adding real implementations later does not require changing the message
router. Important Not every command name supplied in the reference menu
can be made genuinely functional without its required external API/service or
media implementation. This build keeps those names registered and returns
a clear message instead of pretending they work. Core bot/pairing/web
functionality is implemented.
