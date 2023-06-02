#!/bin/bash

# Change to the /support/ directory
cd /support/

echo ""

# Download Autodock Vina source code
if [ -d "AutoDock-Vina-1.2.3" ]; then
    echo "AutoDock-Vina-1.2.3 source code already downloaded"
else
    echo "Downloading AutoDock-Vina-1.2.3 source code"
    rm -rf v1.2.3.zip
    wget https://github.com/ccsb-scripps/AutoDock-Vina/archive/refs/tags/v1.2.3.zip
    unzip v1.2.3.zip
    rm v1.2.3.zip
fi

# Download the boost
if [ -d "boost_1_82_0" ]; then
    echo "boost_1_82_0 already downloaded"
else
    echo "Downloading boost_1_82_0"
    wget https://boostorg.jfrog.io/artifactory/main/release/1.82.0/source/boost_1_82_0.tar.gz
    tar -xf boost_1_82_0.tar.gz
    rm boost_1_82_0.tar.gz
fi

# Download the latest version of emscripten
if [ -d "emsdk" ]; then
    echo "emsdk already downloaded"
    cd emsdk
else
    echo "Downloading and installing emsdk"
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    git pull
    ./emsdk install latest
fi

echo ""

# Activate the latest version of emscripten
./emsdk activate latest
source ./emsdk_env.sh
# emcc ---check

cd ..

# Compile the boost libraries needed for Vina
if [ -f "boost_1_82_0/stage/lib/libboost_filesystem.bc" ]; then
    echo ""
    echo "boost_1_82_0/stage/lib/libboost_filesystem.bc already exists, so assuming boost_1_82_0 already compiled"
    echo ""
else
    echo "Compiling boost_1_82_0"
    cd boost_1_82_0
    ./bootstrap.sh
    # emconfigure ./b2 toolset=emscripten link=static --with-program_options --with-system --with-serialization --with-thread --with-filesystem
    emconfigure ./b2 toolset=emscripten cxxflags=-O3 link=static --with-program_options --with-system --with-serialization --with-thread --with-filesystem
    cd ..
fi

# Now ready to compile Vina

# Remove any previous compilation
rm -rf AutoDock-Vina-1.2.3/build/linux/release_wasm

# Make a copy of the release directory, where we will build wasm vina (webina)
cp -r AutoDock-Vina-1.2.3/build/linux/release AutoDock-Vina-1.2.3/build/linux/release_wasm

# Copy makefile_common too, which we will modify
cp AutoDock-Vina-1.2.3/build/makefile_common AutoDock-Vina-1.2.3/build/linux/release_wasm/

# Make that the new present working directory
cd AutoDock-Vina-1.2.3/build/linux/release_wasm

# Copy wasm-compiled boost files
mkdir -p ./include/boost
cp -r /support/boost_1_82_0/boost/* ./include/boost/
cp /support/boost_1_82_0/stage/lib/*.bc ./include/boost/

# Now we will modify the Makefile

# The new makefile_common file is in same directory
sed -i "s|../../makefile_common|makefile_common|g" Makefile

# Use em++ instead of g++
sed -i "s|/usr/bin/g++|em++|g" Makefile

# Link to the boost libraries
sed -i "s|++11|++11 -Iinclude -Linclude/boost|g" Makefile

# Ignore errors that will otherwise halt the compilation
sed -i "s|++11|++11 -Wno-enum-constexpr-conversion|g" Makefile

# Make it so you can import webina as an ES6 module
sed -i "s|++11|++11 -s MODULARIZE=1 -s EXPORT_ES6=1 -s 'EXPORT_NAME=\"WEBINA_MODULE\"'|g" Makefile

# Allow memory growth
sed -i "s|++11|++11 -sALLOW_MEMORY_GROWTH|g" Makefile

# Use pthreads. Note that PTHREAD_POOL_SIZE indicates the number of workers that
# are created initially, but additional workers can be created as required.
# PTHREAD_POOL_SIZE is not a hard cap.
sed -i "s|++11|++11 -s USE_PTHREADS=1 -s PROXY_TO_PTHREAD=1 -s PTHREAD_POOL_SIZE=2|g" Makefile

# Prevent Webina from running automatically (run only when the callMain is
# called).
sed -i "s|++11|++11 -s EXPORTED_RUNTIME_METHODS='[\"callMain\", \"FS\"]'|g" Makefile
sed -i "s|++11|++11 -s INVOKE_RUN=0|g" Makefile

# Os makes for smaller filesize, but O3 is faster. File size difference isn't
# that big.
# sed -i "s/-O3/-Os/g" Makefile

# This flag avoids an error in the browser and makes it so the onExit() function
# gets called.
sed -i "s|++11|++11 -s EXIT_RUNTIME=1|g" Makefile

# No need to include NODEJS code.
sed -i "s|++11|++11 -sENVIRONMENT=web,worker|g" Makefile

# Add some files to the precache to experiment with
# sed -i "s|++11|++11 --preload-file /support/1xdn.pdbqt@/receptor.pdbqt --preload-file /support/ATP.pdbqt@/ligand.pdbqt|g" Makefile

# Below is for debugging only. It slows things down a bit, so good not to use in
# production.
# sed -i "s|++11|++11 -sASSERTIONS|g" Makefile
# sed -i "s|++11|++11 -sNO_DISABLE_EXCEPTION_CATCHING|g" Makefile

# Now we will modify the makefile_common file

# em++ struggles to find the boost libraries, so we will provide the paths
# explicitly.
sed -i "s|LIBS |LIBS = include/boost/*.bc #|g" makefile_common

# Clean up any previous runs
make clean

# Compile vina, saving the output to compile.out
emmake make -j8 vina | tee compile.out

# Repeat the last command, but outputing to out/vina.html instead of just vina.
mkdir -p out
tail -n 1 compile.out | sed "s|-o vina|-o out/vina.js|g" | bash

# Add "/* eslint-disable */" as the first line of the ./out/vina.js and
# ./out/vina.worker.js files.
echo '/* eslint-disable */' | cat - ./out/vina.js > temp && mv temp ./out/vina.js
echo '/* eslint-disable */' | cat - ./out/vina.worker.js > temp && mv temp ./out/vina.worker.js

# Remove the string "use strict"; from ./out/vina.worker.js
sed -i "s|.use strict..||g" ./out/vina.worker.js

# Clean up
make clean

# Copy index.html, .htaccess (apache), and pdbqt files to the out directory to
# finish the demo
cp /support/index.html out/
cp /support/htaccess  out/.htaccess
cp /support/*.pdbqt out/
