#!/bin/bash

# Change to the /support/ directory
cd /support/

echo ""

# Download reduce source code
if [ -d "reduce-4.13" ]; then
    echo "reduce-4.13 source code already downloaded"
else
    echo "Downloading reduce-4.13 source code"
    rm -rf v4.13.zip
    wget https://github.com/rlabduke/reduce/archive/refs/tags/v4.13.zip
    unzip v4.13.zip
    rm v4.13.zip
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

# Now ready to compile reduce

# Remove any previous compilation
rm -rf reduce-4.13_wasm

# Make a copy of the directory, where we will build wasm reduce
cp -r reduce-4.13 reduce-4.13_wasm

# Make that the new present working directory
cd reduce-4.13_wasm

# Remove register from all code. This is a deprecated keyword in C++17.
find . -type f -name '*.cpp' -exec sed -i 's/register //g' {} \;

# All Makefiles should use em++, not g++
find . -name "Makefile" -type f -exec sed -i "s|CXX		= g++|CXX		= em++|g" {} \;

cd reduce_src

# Make it so you can import webina as an ES6 module
sed -i "s| -o | -s MODULARIZE=1 -s EXPORT_ES6=1 -s 'EXPORT_NAME=\"REDUCE_MODULE\"' -o |g" Makefile

# Allow memory growth
sed -i "s| -o | -sALLOW_MEMORY_GROWTH -o |g" Makefile

# Prevent Webina from running automatically (run only when the callMain is
# called).
sed -i "s| -o | -s EXPORTED_RUNTIME_METHODS='[\"callMain\", \"FS\"]' -o |g" Makefile
sed -i "s| -o | -s INVOKE_RUN=0 -o |g" Makefile

# Os makes for smaller filesize, but O3 is faster. File size difference isn't
# that big.
# sed -i "s/-O3/-Os/g" Makefile

# This flag avoids an error in the browser and makes it so the onExit() function
# gets called.
sed -i "s| -o | -s EXIT_RUNTIME=1 -o |g" Makefile

# No need to include NODEJS code.
sed -i "s| -o | -sENVIRONMENT=web,worker -o |g" Makefile

# Add database files to the precache
sed -i "s| -o | --preload-file /support/reduce-4.13_wasm/reduce_wwPDB_het_dict.txt@/reduce_wwPDB_het_dict.txt -o |g" Makefile

# Compile to index.html
sed -i "s| -o .. | --shell-file template.html -o ../out/index.html |g" Makefile

# Comment out mv and cp commands that otherwise cause an error
sed -i "s|mv reduce|# mv reduce|g" Makefile
sed -i "s|cp |# cp |g" Makefile

# # Below is for debugging only. It slows things down a bit, so good not to use in
# # production.
# # sed -i "s|++11|++11 -sASSERTIONS|g" Makefile
# # sed -i "s|++11|++11 -sNO_DISABLE_EXCEPTION_CATCHING|g" Makefile

cd -
mkdir -p out
cp ../template.html reduce_src/

# Clean up any previous runs
make clean

# Compile reduce
emmake make -j8 # | tee compile.out
emmake make install

# Add "/* eslint-disable */" as the first line of the ./out/index.js
echo '/* eslint-disable */' | cat - out/index.js > temp && mv temp out/index.js

# Clean up
make clean

# Copy index.html and .htaccess (apache) files to the out directory to finish
# the demo
cp /support/index.html out/
cp /support/htaccess  out/.htaccess

