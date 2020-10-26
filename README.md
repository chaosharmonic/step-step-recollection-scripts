# Step Step Recollection (Scripts)

A collection of Deno scripts for managing Stepmania simfiles

Includes tools for batch operations such as:

* Bulk updating chart difficulties
* Converting legacy .sm files to .ssc and updating formatting accordingly
* Exporting simfile metadata to JSON
* Uploading extracted metadata to an API

This is a companion project to [Step Step Recollection](https://github.com/chaosharmonic/step-step-recollection), a workout tracker for rhythm games. At its core, it was built as a seeding tool (the rest mostly aided with data consistency), but I'll be circling back to it periodically as I continue fleshing out the mai n project's data model.

## Installation and Usage

* Download this repo to your local system using `git clone` and `cd` into the project folder
* Install Deno locally with the package manager of your choice. All other dependencies are imported using ES modules and will load on first run.
* Move any simfiles you want to edit or scrape into the `/Input/Simfiles` path.
    * The `utils.js` file includes an initial dataset containing a collection of releases, with each entry's title corresponding to a top-level folder in your simfiles path. In addition to walking through these directories, the data is also used to seed releases and generate output paths.
* To manipulate files:
    * Run the relevant script using `deno run --allow-read --allow-write --unstable ${filename}`
    * The `--unstable` flag is currently required because of Deno's fs module. You should be able to remove it once this is resolved upstream.
* To use the seeder:
    * Create a `.env` file from the included `.env-example`, filling in the `EXPRESS_URL` field with the URL of your API.
    * Run using `deno run --allow-read --allow-net seedSimfileData.js`

## Additional notes

* File manipulation scripts assume the same structure as Stepmania's `Songs` folder: one top-level folder per release, followed by one parent folder for each individual song.
    * Example file path: `/Simfiles/Dance Dance Revolution 3rdMIX/CAPTAIN JACK (GRANDALE MIX)/CAPTAIN JACK (GRANDALE MIX).ssc`
* This should, in theory, run anywhere that Deno will. That said, I don't personally have any Apple devices, so it's only been tested thus far on Windows and Linux.