# MolModa 1.0.1

Molecular docking advances early-stage drug discovery by predicting the
geometries and affinities of small-molecule compounds bound to drug-target
receptors. Researchers can leverage these predictions to prioritize drug
candidates for experimental testing. MolModa provides a secure, accessible
environment where users can perform molecular docking entirely in their web
browsers.

## Accessing MolModa Online

This repository contains MolModa's source code. The vast majority of users will
not need to interact with this repository directly. They can simply access the
compiled version of MolModa online, without login or registration, at
[https://durrantlab.com/molmoda](https://durrantlab.com/molmoda).

## Running MolModa Locally

If you wish to run MolModa locally:

1. Download a compiled version from the
   [GitHub releases page](https://github.com/durrantlab/molmoda/releases/).
2. Extract the contents of the zip file.
3. Change into the extracted directory using a command-line terminal (e.g., the
   Terminal app on macOS, the Command Prompt on Windows, or a terminal emulator
   on Linux).
4. Start a webserver in that directory. This step requires some expertise and is
   beyond the scope of this README file, but we provide a simple Python-based
   server (`server.py`) in the extracted folder that you can run via `python3
   server.py`.
5. Navigate to the appropriate URL in your web browser (probably
   [http://localhost:8000/](http://localhost:8000/)) to use the app.

## Compiling MolModa from Source

Compiling MolModa from source is technically challenging and should only be
necessary for developers who wish to modify the app. MolModa compilation
requires a UNIX-like operating system (e.g., Linux or macOS). Windows users can
use the Windows Subsystem for Linux (WSL). Compiling also requires node.js and
the npm package manager. Here are some general steps to compile MolModa from
source:

1. Clone this repository: `git clone https://github.com/durrantlab/molmoda.git`
2. Change into the cloned directory: `cd molmoda`
3. Install the necessary dependencies: `npm install`
4. To run a server for development, use `npm run serve`.
5. To compile the app for production, use `./clear_compile_cache.sh; npm run
   build`.

## License

MolModa: client-side structure-based drug design in a web browser
Copyright (C) 2026 Jacob Durrant

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; version 2 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

MolModa bundles third-party programs under their own licenses. See
THIRD-PARTY-LICENSES.md.
