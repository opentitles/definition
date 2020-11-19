<p align="center">
 <img src="https://raw.githubusercontent.com/opentitles/client/master/images/header.png")/>
 <i>See https://opentitles.info/ for download links and more information.</i>
</p>

# OpenTitles Definition

The definition repository contains the list of media that OpenTitles keeps track of. Feel free to open a pull request to add a new medium!
Every time a pull request get opened, the validator (located in `/src`) will check every medium to see if the definition is functional.

## Running
```sh
npm ci
npm run compile
npm start
```

In order to validate some media only, simply pass their names as space-separated parameters:
```sh
npm start CNN
```
```sh
npm start NOS AD Volkskrant
```
This selection is case-sensitive, check media.json for the proper spelling and capitalization.
