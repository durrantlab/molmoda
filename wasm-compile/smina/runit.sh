# Build the docker container. Might require sudo
docker build -t babel_wasm .

docker run \
  --rm \
  --name babel_wasm \
  --volume $(pwd)/support:/support:rw \
  babel_wasm

# Remove out/ if it exists
rm -rf out/

# podman rmi --all
# Copy new compiled wasm files
# cp -r support/AutoDock-Vina-1.2.3/build/linux/release_wasm/out ./

# cp out/vina.js /home/hiisi/workspace/molmoda/molmoda/public/js/webina/vina.js
# cp out/vina.worker.mjs /home/hiisi/workspace/molmoda/molmoda/public/js/webina/vina.worker.mjs
# cp out/vina.wasm /home/hiisi/workspace/molmoda/molmoda/public/js/webina/vina.wasm

echo ""
echo "If all went well, your compiled webina demo (including the hidden .htaccess file) is in ./out/"
echo ""
