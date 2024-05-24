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

# Download OpenBabel source code
if [ -d "openbabel" ]; then
    echo "openbabel-$OBABEL_VERSION source code already downloaded"
else
    echo "Downloading openbabel-$OBABEL_VERSION source code"
    rm -rf openbabel
    wget -O openbabel-$OBABEL_VERSION.tar.bz2 https://github.com/openbabel/openbabel/releases/download/openbabel-3-1-1/openbabel-3.1.1-source.tar.bz2
    tar -xf openbabel-$OBABEL_VERSION.tar.bz2
    mv openbabel-$OBABEL_VERSION openbabel
    rm openbabel-$OBABEL_VERSION.tar.bz2
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
     # emconfigure ./b2 toolset=emscripten --with-iostreams
     ./b2 clean
     ./b2 -d+2 --debug-configuration toolset=emscripten cxxflags="-flto -s USE_ZLIB=1" link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem --with-iostreams --with-test --with-regex
    # emconfigure ./b2 toolset=emscripten cxxflags="-flto" link=static runtime-link=static threading=multi --with-program_options --with-system --with-serialization --with-thread --with-filesystem --with-iostreams

    
    cd ..
fi
#

# Copy wasm-compiled boost files
mkdir -p ./include/boost
cp -r /support/boost_$BOOST_VERSION_UNDERSCORE/boost/* ./include/boost/
# cp -r boost_1_82_0/boost/* ./include/boost/
BC_FILES=/support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.bc
for bc_file in $BC_FILES
do
    emar q "${bc_file%.bc}.a" $bc_file
done
cp /support/boost_$BOOST_VERSION_UNDERSCORE/stage/lib/*.a ./include/boost/
cp boost_1_82_0/stage/lib/*.bc ./include/boost/


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
    tar -xzf eigen.tar.gz
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

# wget -O libclang_rt.builtins-wasm32.a https://github.com/jedisct1/libclang_rt.builtins-wasm32.a/blob/master/precompiled/llvm-10-to-14/libclang_rt.builtins-wasm32.a
# cp libclang_rt.builtins-wasm32.a /usr/local/lib/wasm32-wasi/

# RUN cd /inchi && \
# sh bin/build-wasm.sh
#

# Clone Open Babel repository
# git clone --depth 1 https://github.com/openbabel/openbabel.git /openbabel

# Build Open Babel with tests disabled
cd openbabel
if [ -d "build" ]; then
    echo "build directory already exists"
else
    mkdir build
fi
sed -i "s/1.45.0/$BOOST_VERSION/g" src/CMakeLists.txt
# Comment lines 96 and 97 in tools/CMakeLists.txt
sed -i "96s/^/#/" tools/CMakeLists.txt
sed -i "97s/^/#/" tools/CMakeLists.txt
# add line 98 message(ERROR "sdfsdfsdfsdf")
# sed -i "98a MESSAGE\(FATAL_ERROR fdsfsgebeb\)" tools/CMakeLists.txt
# delete line 99
# sed -i "99d" tools/CMakeLists.txt
# after the line containing "if(EIGEN2_FOUND OR EIGEN3_FOUND)" add the folloding line:
# message(ERROR "sdfsdfsdfsdf")
# sed -i "s/message(FATAL_ERROR \"sdfsdfsdfsdf\")//g" src/CMakeLists.txt
# sed -i "s/if(LIBXML2_FOUND AND WITH_STATIC_LIBXML)/if(LIBXML2_FOUND AND WITH_STATIC_LIBXML)\nmessage(FATAL_ERROR \"sdfsdfsdfsdf\")/g" src/CMakeLists.txt
# add after line 194 in src/CMakeLists.txt echo "sdfsdfsdfsdf"
cd build
rm -rf *
emcmake cmake .. \
  -DBUILD_SHARED=OFF \
  -DWITH_STATIC_LIBXML=ON \
  -DCMAKE_CXX_STANDARD=11 \
  -DCMAKE_CXX_FLAGS="-s USE_PTHREADS=1 -pthread" \
  -DCMAKE_EXE_LINKER_FLAGS="-s USE_PTHREADS=1 -pthread -s PTHREAD_POOL_SIZE=4" \
  -DWITH_STATIC_LIBXML=ON \
  -DBoost_NO_SYSTEM_PATHS=ON \
  -DBoost_USE_STATIC_LIBS=ON \
  -DBoost_USE_STATIC_RUNTIME=ON \
  -DBoost_USE_MULTITHREADED=ON \
  -DBoost_COMPILER=-emscripten \
  -DOPENBABEL_USE_SYSTEM_INCHI=OFF \
  -DCMAKE_EXE_LINKER_FLAGS="-static -pthread" \
  -DCMAKE_TOOLCHAIN_FILE=/support/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
  -DZLIB_LIBRARY=/support/zlib/libz.a \
  -DLIBXML2_INCLUDE_DIR=/support/libxml2/include/libxml2 \
  -DLIBXML2_LIBRARY=/support/libxml2/.libs/libxml2.a \
  -DZLIB_INCLUDE_DIR=/usr/local/include \
  -DBOOST_ROOT=/support/boost_1_82_0 \
  -DBoost_INCLUDE_DIR=/support/boost_1_82_0 \
  -DBoost_LIBRARY_DIR=/support/boost_1_82_0/stage/lib \
  -DCMAKE_INSTALL_PREFIX=/usr/local \
  -DCMAKE_FIND_LIBRARY_SUFFIXES=".a" \
  -DCMAKE_EXE_LINKER_FLAGS_RELEASE="-static-libgcc -static-libstdc++"
# append  src/CMakeFiles/openbabel.dir/formats/xml/xmlformat.cpp.o to tools/CMakeFiles/obabel.dir/link.txt
# sed -i "s|-o ../bin/obabel.js|../src/CMakeFiles/openbabel.dir/formats/xml/cmlformat.cpp.o -o ../bin/obabel.js|g" tools/CMakeFiles/obabel.dir/link.txt
# append tools/CMakeFiles/obabel.dir/objects1 to include cmlformat.cpp.o
# sed -i "s|CMakeFiles/obabel.dir/obabel.cpp.o|CMakeFiles/obabel.dir/obabel.cpp.o ../src/CMakeFiles/openbabel.dir/formats/xml/cmlformat.cpp.o ../src/CMakeFiles/openbabel.dir/formats/xml/xmlformat.cpp.o|g" tools/CMakeFiles/obabel.dir/objects1
# for each .o file in src/CMakeFiles/openbabel.dir/formats/ add it to the end of tools/CMakeFiles/obabel.dir/objects1
emmake make -j$(nproc) install
for file in `ls src/CMakeFiles/openbabel.dir/formats/xml/*.o`
do
    echo $file
    sed -i "s|CMakeFiles/obabel.dir/obabel.cpp.o|CMakeFiles/obabel.dir/obabel.cpp.o ../$file|g" tools/CMakeFiles/obabel.dir/objects1
done
emmake make -j$(nproc) install
