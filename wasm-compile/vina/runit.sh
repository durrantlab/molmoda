# First, prepare the support files for use in the docker container. I had
# trouble doing this in docker, so I will do it in the host system.

export VINA_VERSION=1.2.3
export DEBUG=0

# Change to the /support/ directory
cd ./support/
echo ""

# Download Autodock Vina source code
if [ -d "AutoDock-Vina-$VINA_VERSION" ]; then
    echo "AutoDock-Vina-$VINA_VERSION source code already downloaded"
else
    echo "Downloading AutoDock-Vina-$VINA_VERSION source code"
    rm -rf v$VINA_VERSION.zip
    wget https://github.com/ccsb-scripps/AutoDock-Vina/archive/refs/tags/v$VINA_VERSION.zip
    unzip v$VINA_VERSION.zip
    rm v$VINA_VERSION.zip
fi

# Remove any previous compilation
rm -rf AutoDock-Vina-$VINA_VERSION/build/linux/release_wasm

# Make a copy of the release directory, where we will build wasm vina (webina)
cp -r AutoDock-Vina-$VINA_VERSION/build/linux/release AutoDock-Vina-$VINA_VERSION/build/linux/release_wasm

# Copy makefile_common too, which we will modify
cp AutoDock-Vina-$VINA_VERSION/build/makefile_common AutoDock-Vina-$VINA_VERSION/build/linux/release_wasm/

# Make that the new present working directory
cd AutoDock-Vina-$VINA_VERSION/build/linux/release_wasm

# Now we will modify the Makefile

# The new makefile_common file is in same directory
sed -i "" "s|../../makefile_common|makefile_common|g" Makefile

# Use em++ instead of g++
sed -i "" "s|/usr/bin/g++|em++|g" Makefile

# Link to the boost libraries
sed -i "" "s|++11|++11 -Iinclude -Linclude/boost|g" Makefile

# Ignore errors that will otherwise halt the compilation
sed -i "" "s|++11|++11 -Wno-enum-constexpr-conversion|g" Makefile

# Make it so you can import webina as an ES6 module
sed -i "" "s|++11|++11 -s MODULARIZE=1 -s EXPORT_ES6=1 -s 'EXPORT_NAME=\"WEBINA_MODULE\"'|g" Makefile

# use precise 32-bit float operations instead of the default imprecise operations
sed -i "" "s|++11|++11 -s PRECISE_F32=1|g" Makefile

# Allow memory growth. JDD TODO: BELOW DOES NOT FIX PROBLEM. STILL MEMORY ISSUE
# AT LIGAND 97: Uncaught (in promise) RuntimeError: Aborted(RangeError:
# WebAssembly.instantiate(): Out of memory: Cannot allocate Wasm memory for new
# instance)
# sed -i "" "s|++11|++11 -sALLOW_MEMORY_GROWTH|g" Makefile

# If you don't allow memory growth, make sure INITIAL_MEMORY is large enough.
# 128 MB is not enough. 256 MB is not enough. 512MB is enough if not using
# MALLOC=mimalloc. but 1024MB is enoguh with MALLOC=mimalloc.
sed -i "" "s|++11|++11 -s INITIAL_MEMORY=1024MB|g" Makefile

# Use mimalloc instead of the default malloc. This is supposed to be faster and
# more memory efficient. https://emscripten.org/docs/porting/pthreads.html
sed -i "" "s|++11|++11 -s MALLOC=mimalloc|g" Makefile

# Use pthreads. Note that PTHREAD_POOL_SIZE indicates the number of workers that
# are created initially, but additional workers can be created as required.
# PTHREAD_POOL_SIZE is not a hard cap. JDD TODO: Note that changing this to
# navigator.hardwareConcurrency did not fix the memory problem. Also, 8 did not
# fix the memory problem.
sed -i "" "s|++11|++11 -s USE_PTHREADS=1 -s PROXY_TO_PTHREAD=1 -s PTHREAD_POOL_SIZE='navigator.hardwareConcurrency'|g" Makefile
# sed -i "" "s|++11|++11 -s USE_PTHREADS=1 -s PROXY_TO_PTHREAD=1 -s PTHREAD_POOL_SIZE=8|g" Makefile

# Prevent Webina from running automatically (run only when the callMain is
# called).
sed -i "" "s|++11|++11 -s EXPORTED_RUNTIME_METHODS='[\"callMain\", \"FS\"]'|g" Makefile
sed -i "" "s|++11|++11 -s INVOKE_RUN=0|g" Makefile

# Os makes for smaller filesize, but O3 is faster. File size difference isn't
# that big.
# sed -i "" "s/-O3/-Os/g" Makefile

# This flag avoids an error in the browser and makes it so the onExit() function
# gets called.
sed -i "" "s|++11|++11 -s EXIT_RUNTIME=1|g" Makefile

# No need to include NODEJS code.
sed -i "" "s|++11|++11 -sENVIRONMENT=web,worker|g" Makefile

# Add some files to the precache to experiment with
# sed -i "" "s|++11|++11 --preload-file /support/1xdn.pdbqt@/receptor.pdbqt --preload-file /support/ATP.pdbqt@/ligand.pdbqt|g" Makefile

if [ $DEBUG -eq 1 ]; then
  # Below is for debugging only. It slows things down a bit, so good not to use in
  # production.
  sed -i "" "s|++11|++11 -sASSERTIONS|g" Makefile
  sed -i "" "s|++11|++11 -sNO_DISABLE_EXCEPTION_CATCHING|g" Makefile
else
  # Remove debugging symbols
  sed -i "" "s|++11|++11 -s DISABLE_EXCEPTION_CATCHING=1|g" Makefile
fi

# Now we will modify the makefile_common file

# em++ struggles to find the boost libraries, so we will provide the paths
# explicitly.
sed -i "" "s|LIBS |LIBS = include/boost/*.a #|g" makefile_common

cd -
cd ../

# Build the docker container. Might require sudo
docker build -t vina_wasm .

docker run \
  --rm \
  --name vina_wasm \
  --volume $(pwd)/support:/support \
  -it \
  vina_wasm

# Remove out/ if it exists
rm -rf out/

# Copy new compiled wasm files
cp -r support/AutoDock-Vina-1.2.3/build/linux/release_wasm/out ./

echo ""
echo "If all went well, your compiled webina demo (including the hidden .htaccess file) is in ./out/"
echo ""
