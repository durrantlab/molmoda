mv ../dist/report.html ../

# Below is commically hacky. When deploying to the server, I want to use
# `publicPath: "./"`, but that occasionally requires accessing scripts from
# js/js/ instead of js/. I'm sure there's a way to make this work better, but
# I'm just going to symlink to the parent directory for now. TODO: Try to fix
# this.
cd ../dist/js
mkdir js
cd js
ln -s ../* ./