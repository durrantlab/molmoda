# Build the docker container. Might require sudo
docker build -t vina_wasm .

docker run \
  --rm \
  --name vina_wasm \
  --volume $(pwd)/support:/support \
  vina_wasm

# Remove out/ if it exists
rm -rf out/

# Copy new compiled wasm files
cp -r support/AutoDock-Vina-1.2.3/build/linux/release_wasm/out ./

echo ""
echo "If all went well, your compiled webina demo (including the hidden .htaccess file) is in ./out/"
echo ""
