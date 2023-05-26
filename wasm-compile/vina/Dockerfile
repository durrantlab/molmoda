FROM ubuntu:23.04
MAINTAINER Jacob Durrant <durrantj@pitt.edu>

# Install all required dependencies
RUN apt-get update && apt-get install -y wget
RUN apt-get install -y git
RUN apt-get install -y python3
RUN apt-get install -y unzip
RUN apt-get install -y nodejs
RUN apt-get install -y xz-utils
RUN apt-get install -y lbzip2
RUN apt-get install -y build-essential

# Copy the script to run in the container
COPY support/run_in_container.sh /usr/local/bin/run_in_container.sh
RUN chmod +x /usr/local/bin/run_in_container.sh

# Run that script
CMD ["/usr/local/bin/run_in_container.sh"]

