#!/bin/bash

# Change to the /support/ directory
cd /support/
echo ""

export BOOST_VERSION=1.82.0 \
 BOOST_VERSION_UNDERSCORE=1_82_0 \
 OBABEL_VERSION=3.1.1 \
 ZLIB_VERSION=1.2.11 \
  LIBXML2_VERSION=2.9.1 \
  EIGEN_VERSION=3.3.9 \
  INCHI_VERSION=1.05 \
  OBABEL_FORMATS="pdbqt pdb"

# Download smina source code
if [ -d "smina" ]; then
    echo "smina source code already downloaded"
else
    rm -rf smina
    echo "Downloading smina source code"
    git clone git://git.code.sf.net/p/smina/code smina-code
    mv smina-code smina
fi

# Download the boost
if [ -d "boost_$BOOST_VERSION_UNDERSCORE" ]; then
    echo "boost_$BOOST_VERSION_UNDERSCORE already downloaded"
else
    echo "Downloading boost_$BOOST_VERSION_UNDERSCORE"
    wget https://boostorg.jfrog.io/artifactory/main/release/$BOOST_VERSION/source/boost_$BOOST_VERSION_UNDERSCORE.tar.gz
    tar -xf boost_$BOOST_VERSION_UNDERSCORE.tar.gz
    rm boost_$BOOST_VERSION_UNDERSCORE.tar.gz
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
  if [ -f "boost_$BOOST_VERSION_UNDERSCORE/stage/lib/libboost_filesystem.a" ]; then
    echo ""
    echo "boost_$BOOST_VERSION_UNDERSCORE/stage/lib/libboost_filesystem.a already exists, so assuming boost_$BOOST_VERSION_UNDERSCORE already compiled"
    echo ""
  else
    echo "Compiling boost_$BOOST_VERSION_UNDERSCORE"
    cd boost_$BOOST_VERSION_UNDERSCORE
    ./bootstrap.sh
    rm -rf bin.v2
     # emconfigure ./b2 toolset=emscripten link=static --with-program_options --with-system --with-serialization --with-thread --with-filesystem
     # emconfigure ./b2 toolset=emscripten --with-iostreams
     ./b2 clean
     ./b2 -d+2 --debug-configuration toolset=emscripten cxxflags="-flto -s USE_ZLIB=1 -s USE_PTHREADS=1" linkflags="-s USE_PTHREADS=1"  link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem --with-iostreams --with-test --with-regex --with-timer --with-date_time
     # ./b2 -d+2 --debug-configuration toolset=emscripten cxxflags="-flto -s USE_ZLIB=1" link=static runtime-link=static threading=multi --with-date_time 
    # emconfigure ./b2 toolset=emscripten cxxflags="-flto" link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem --with-iostreams

    
    cd ..
  fi

# Copy wasm-compiled boost files
mkdir -p ./include/boost
cp -r /support/boost_$BOOST_VERSION_UNDERSCORE/boost/* ./include/boost/
# cp -r boost_1_82_0/boost/* 
BC_FILES=/support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.bc
for bc_file in $BC_FILES
do
    echo "Copying $bc_file"
    emar q "${bc_file%.bc}.a" $bc_file
done

cp /support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.a ./include/boost/
cp boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.bc ./include/boost/


if [ -d "zlib" ]; then
    echo "zlib already downloaded"
else
    echo "Downloading zlib"
    wget -O zlib.tar.gz https://github.com/madler/zlib/archive/refs/tags/v$ZLIB_VERSION.tar.gz 
    tar -xzf zlib.tar.gz 
    rm zlib.tar.gz 
    mv zlib-$ZLIB_VERSION zlib 
    cd zlib 
    # emcmake cmake .
    emconfigure ./configure
    emmake make install
    cd ..
fi


# Download and compile libxml2
if [ -d "libxml2" ]; then
    echo "libxml2 already downloaded"
else
    echo "Downloading libxml2"
    wget -O libxml2.tar.gz https://github.com/GNOME/libxml2/archive/refs/tags/v$LIBXML2_VERSION.tar.gz 
    tar -xzf libxml2.tar.gz 
    rm libxml2.tar.gz 
    rm -rf libxml2
    mv libxml2-$LIBXML2_VERSION libxml2 
    cd libxml2 
    ./autogen.sh
    export CFLAGS="-I/support/zlib"
    export LDFLAGS="-L/support/zlib"
    emconfigure ./configure --without-python
    emmake make -j$(nproc)
    cd ..
fi
#


# Download and compile Eigen
if [ -d "eigen" ]; then
    echo "eigen already downloaded"
else
    echo "Downloading eigen"
    wget --no-check-certificate -O eigen.tar.gz https://gitlab.com/libeigen/eigen/-/archive/$EIGEN_VERSION/eigen-$EIGEN_VERSION.tar.gz
    tar -xzf eigen.tar.gzcourier
    rm eigen.tar.gz 
    mv eigen-$EIGEN_VERSION eigen
fi
# cd eigen 
# mkdir build 
# cd build 
# emcmake cmake .. 
# emmake make -j$(nproc) install

# Clone and compile wasi-libc
if [ -d "wasi-libc" ]; then
    echo "wasi-libc already downloaded"
else
    echo "Downloading wasi-libc"
    git clone https://github.com/WebAssembly/wasi-libc.git wasi-libc 
    cd wasi-libc 
    make -j$(nproc) 
    make install
    cd ..
fi

# Download and copy precompiled InChI library
if [ -d "inchi" ]; then
    echo "inchi already downloaded"
else
    echo "Downloading inchi"
    git clone https://github.com/rapodaca/inchi-wasm.git inchi
fi

export WASI_LIBC_HOME=/usr/local/lib/wasm32-wasi

cd smina
if [ -d "build" ]; then
    echo "build directory already exists"
else
    mkdir build
fi
cd build
rm -rf *

sed -i '/^[[:space:]]*thread[[:space:]]*$/d' ../CMakeLists.txt
# replace Threads::Threads with /support/boost_1_82_0/stage/lib/libboost_thread.a in CMakeLists.txt
sed -i 's/Threads::Threads/\/support\/boost_1_82_0\/stage\/lib\/libboost_thread.a/g' ../CMakeLists.txt
# replace unordered_map with boost::unordered_map in ../src/lib/CommandLine2/CommandLine.cpp
sed -i 's/unordered_map</boost::unordered_map</g' ../src/lib/CommandLine2/CommandLine.cpp

emcmake cmake .. \
  -DCMAKE_CXX_STANDARD=11 \
  -DCMAKE_EXE_LINKER_FLAGS="-s USE_PTHREADS=1 -pthread -s USE_ZLIB=1 -s PROXY_TO_PTHREAD=1 -s MODULARIZE=1 -s EXPORT_NAME='SMINA_MODULE' -s EXPORTED_FUNCTIONS='FS' -s ENVIRONMENT=web,worker -Wl,--no-check-features" \
  -DCMAKE_CXX_FLAGS="-s USE_PTHREADS=1 -pthread -s USE_ZLIB=1 -s PROXY_TO_PTHREAD=1 -s ENVIRONMENT=web,worker -s MODULARIZE=1 -s EXPORT_NAME='SMINA_MODULE'" \
  -DCMAKE_TOOLCHAIN_FILE=/support/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
  -DCMAKE_INSTALL_PREFIX=/usr/local \
  -DBOOST_ROOT=/support/boost_1_82_0 \
  -DBoost_INCLUDE_DIR=/support/boost_1_82_0 \
  -DBoost_LIBRARY_DIR=/support/boost_1_82_0/stage/lib \
  -DZLIB_LIBRARY=/support/zlib/libz.a \
  -DCMAKE_FIND_LIBRARY_SUFFIXES=".a" \
  -DCMAKE_EXE_LINKER_FLAGS_RELEASE="-static-libgcc -static-libstdc++"

emmake make -j$(nproc) VERBOSE=1

echo "Finished compiling smina"
exit 0
