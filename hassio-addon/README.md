# Tunet

A dashboard for Home Assistant with configurable cards, pages and themes.

## Before the first storage update

**Using version 1.25.1 or earlier? Turn off automatic updates for Tunet until you have
saved your profiles.** Do not rely on a newly added breaking-version marker to protect
an already installed version.

The older add-on stores its database inside the container. Home Assistant replaces that
container during an update, and the old database is not included in a normal Home
Assistant backup. The next release fixes storage for future updates, but cannot recover
data from the old container afterwards.

You can preserve your dashboards entirely in the browser:

1. Open **System → Profiles → Export to file** to save your current dashboard first.
2. Load each saved profile you want to keep and export it to a separate file. Each Home
   Assistant user must do this for their own profiles.
3. If you need an older layout from settings history, load and export that layout too.
   These files contain dashboard snapshots, not a complete database or history backup.
4. After updating, import each file and save it as a profile again. Finish by importing
   the current dashboard you exported first.

Your active dashboard remains in the same browser if its site data is retained.
New installations and ordinary Docker Compose installations do not need this step.

Once the add-on uses persistent storage, later updates preserve profiles and settings.
