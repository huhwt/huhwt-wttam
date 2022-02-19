[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

![webtrees major version](https://img.shields.io/badge/webtrees-v2.0.x-green)
![Latest Release](https://img.shields.io/github/v/release/huhwt/huhwt-wttam)

This [webtrees](https://www.webtrees.net/) module hosts TAM -Topographic Attribute Maps-, a node-link diagram overlaid with temporal information.

## Contents
This readme contains the following main sections

* [description](#description)
* [requirements](#requirements)
* [installation](#installation)
* [upgrade](#upgrade)
* [translations](#translation)
* [Support Contact](#support)
* [Thanks](#thanks)
* [license](#license)

<a name="description"></a>
## Description

[TAM](https://github.com/huhwt/huhwt-wttam) stands for 'Topographic Attribute Map'. It is a node-link diagram, highlighted with time references, realized on the basis of D3.js force simulation.

It can read in external data in a specific format as well as extract the relevant information from a pure Gedcom 5 import. It is possible to save the current state of a diagram externally in a specific format.

In connection with the embedding in [webtrees], internal data management was also implemented, based on IndexedDB.

The PHP part of this module manages the transfer of data from the web server (stored there as a SESSION variable) via LocalStorage in IndexedDB.

The actual TAM functions are encapsulated in their own directory tree and therefore have no contact with the PHP components.

<a name="requirements"></a>
## Requirements

This module requires **webtrees** version 2.0.x, not version 2.1.x.
This module has the same general requirements as named for **Webtrees** overall [webtrees#system-requirements](https://github.com/fisharebest/webtrees#system-requirements).

<a name="installation"></a>
## Installation

This section describes how to install this module.

1. Download [Latest Release](https://github.com/huhwt/huhwt-wttam/releases/latest).
2. Unzip to the `webtrees/modules_v4` directory on the web server.
3. Occasionally rename the folder to `huhwt-wttam`. If the folder already exists, it can be easily overwritten.

<a name="upgrade"></a>
## Upgrade

For the latest version, simply replace the existing huhwt-wttam files with those from the latest release.

<a name="translation"></a>
## translation

You can help translate this module. The po/mo system is used in the PHP part. The Javascript components have their own independent i18n implementation. The texts are represented by key/value assignments, the content can be found in 'translations.js'.
Updated translations will be distributed with the next release of the module.

So far there is only English and German.

<a name="support"></a>
## support

<span style="font-weight: bold;">Issues: </span>You can report bugs by filing an issue in this GitHub repository.

<a name="thanks"></a>
## Acknowledgments

Special thanks are due to R.Preiner and his team at the University of Graz, who published the procedure in his repository https://github.com/rpreiner/tam.

<a name="license"></a>
## License

This program is open source, governed by the terms of the GNU General Public License, either version 3 of the License, or (at your option) any later version.

You should have received a copy of the GNU General Public License with this program, if not see <http://www.gnu.org/licenses/>.

* * *