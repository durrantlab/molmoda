# Use an Emscripten base image. Unfortunately that only a very old version of
# enscriptem seems to compile boost successfully.
FROM emscripten/emsdk:2.0.0

# Set environment variables for library paths
ENV BOOST_VERSION=1.75.0 \
    BOOST_VERSION_UNDERSCORE=1_75_0

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
        build-essential \
        cmake \
        autoconf \
        libtool \
        automake \
        llvm \
        git \
        wget \
        pkg-config \
        libssl-dev \
        python3 \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and build Boost
RUN wget -O /boost.tar.gz https://boostorg.jfrog.io/artifactory/main/release/$BOOST_VERSION/source/boost_$BOOST_VERSION_UNDERSCORE.tar.gz
RUN tar -xzf /boost.tar.gz
RUN ls -l /
RUN rm /boost.tar.gz
RUN mv boost_$BOOST_VERSION_UNDERSCORE /boost

RUN cd /boost && \
    ./bootstrap.sh

RUN cd /boost && \
    ./b2 toolset=emscripten link=static variant=release \
        --with-program_options --with-system --with-serialization --with-thread --with-filesystem \
        --prefix=/boost/install \
        -j$(nproc) install

# Copy the script to run in the container
COPY support/run_in_container.sh /usr/local/bin/run_in_container.sh
RUN chmod +x /usr/local/bin/run_in_container.sh

# Run that script
CMD ["/usr/local/bin/run_in_container.sh"]

# # Set the default command
# CMD ["bash"]
