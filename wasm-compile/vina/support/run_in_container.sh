#!/bin/bash

# Change to the /support/ directory
cd /support/
echo ""

export BOOST_VERSION=1.82.0
export BOOST_VERSION_UNDERSCORE=1_82_0
export VINA_VERSION=1.2.3

# Download the boost
if [ -d "boost_$BOOST_VERSION_UNDERSCORE" ]; then
    echo "boost_$BOOST_VERSION_UNDERSCORE already downloaded"
else
    echo "Downloading boost_$BOOST_VERSION_UNDERSCORE"
    wget https://boostorg.jfrog.io/artifactory/main/release/$BOOST_VERSION/source/boost_$BOOST_VERSION_UNDERSCORE.tar.gz
    tar -xf boost_$BOOST_VERSION_UNDERSCORE.tar.gz
    rm boost_$BOOST_VERSION_UNDERSCORE.tar.gz
fi

# Download the latest version of emscripten. Note that this worked on 3.1.56. If
# you run into errors in the future, consider using that older version.
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
if [ -f "boost_$BOOST_VERSION_UNDERSCORE/stage/lib/libboost_filesystem.bc" ]; then
    echo ""
    echo "boost_$BOOST_VERSION_UNDERSCORE/stage/lib/libboost_filesystem.bc already exists, so assuming boost_$BOOST_VERSION_UNDERSCORE already compiled"
    echo ""
else
    echo "Compiling boost_$BOOST_VERSION_UNDERSCORE"
    cd boost_$BOOST_VERSION_UNDERSCORE
    ./bootstrap.sh
    rm -rf bin.v2
    # emconfigure ./b2 toolset=emscripten link=static --with-program_options --with-system --with-serialization --with-thread --with-filesystem
    # emconfigure ./b2 toolset=emscripten cxxflags="-flto" link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem
    emconfigure ./b2 toolset=emscripten cxxflags="-flto" link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem

    cd ..
fi

cd AutoDock-Vina-$VINA_VERSION/build/linux/release_wasm

# Now ready to compile Vina
# Copy wasm-compiled boost files
mkdir -p ./include/boost
cp -r /support/boost_$BOOST_VERSION_UNDERSCORE/boost/* ./include/boost/
BC_FILES=/support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.bc
for bc_file in $BC_FILES
do
    emar q "${bc_file%.bc}.a" $bc_file
done
cp /support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.a ./include/boost/

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
echo '/* eslint-disable */' | cat - ./out/vina.worker.mjs > temp && mv temp ./out/vina.worker.mjs

# Remove the string "use strict"; from ./out/vina.worker.js
sed -i "s|.use strict..||g" ./out/vina.worker.mjs

# Clean up
make clean

# Copy index.html, .htaccess (apache), and pdbqt files to the out directory to
# finish the demo
cp /support/index.html out/
cp /support/htaccess  out/.htaccess
cp /support/*.pdbqt out/
