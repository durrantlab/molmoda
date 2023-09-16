# Build the docker container. Might require sudo
docker build -t reduce_wasm .

docker run \
  --rm \
  --name reduce_wasm \
  --volume $(pwd)/support:/support \
  reduce_wasm

# Remove out/ if it exists
rm -rf out/

# Copy new compiled wasm files
cp -r support/reduce-4.13_wasm/out ./

echo ""
echo "If all went well, your compiled webina demo (including the hidden .htaccess file) is in ./out/"
echo ""
