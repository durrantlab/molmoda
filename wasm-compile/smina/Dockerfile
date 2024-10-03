FROM ubuntu:23.04

# Install all required dependencies
RUN apt-get update && apt-get install -y wget
RUN apt-get install -y git
RUN apt-get install -y python3
RUN apt-get install -y unzip
RUN apt-get install -y nodejs
RUN apt-get install -y xz-utils
RUN apt-get install -y lbzip2
RUN apt-get install -y build-essential
RUN apt-get install -y cmake
RUN apt-get install -y autoconf
RUN apt-get install -y libtool
RUN apt-get install -y automake
RUN apt-get install -y llvm
RUN apt-get install -y libboost-all-dev
RUN apt-get install -y pkg-config
RUN apt-get install -y libssl-dev
RUN apt-get install -y python3-dev
RUN apt-get install -y python3-pip
RUN apt-get install -y python3-venv
RUN apt-get install -y clang


# Copy the script to run in the container
COPY support/run_in_container.sh /usr/local/bin/run_in_container.sh
RUN chmod +x /usr/local/bin/run_in_container.sh
# Run that script
CMD ["/usr/local/bin/run_in_container.sh"]
