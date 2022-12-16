# I'm going to compile this outside WebPack. It's an external library. Just
# easier this way.

# Clear dist dir
mkdir -p dist
rm -f ./dist/*

# Copy over support files.
cp src/*.js ./dist/
#cp src/*data ./dist/
cp src/*.wasm ./dist/

# Compile typescript
../../../../../node_modules/typescript/bin/tsc --outFile dist/FpocketWeb.js src/FpocketWeb.ts

# Closure compile javascript files (NOT advanced).
#node ../../node_modules/google-closure-compiler/cli.js --compilation_level SIMPLE_OPTIMIZATIONS --js=dist/FpocketWeb.js --js_output_file=dist/FpocketWeb.min.js
#node ../../node_modules/google-closure-compiler/cli.js --compilation_level SIMPLE --js=dist/fpocket.js --js_output_file=dist/fpocket.min.js
#node ../../node_modules/google-closure-compiler/cli.js --js=dist/vina.worker.js --js_output_file=dist/vina.worker.min.js
# TODO: Need to minimize
cp dist/fpocket.js dist/fpocket.min.js
cp dist/FpocketWeb.js dist/FpocketWeb.min.js

# All min.js files should refer to other min.js files.
ls dist/*.min.js | awk '{print "cat " $1 " | sed \"s/\\.js/.min.js/g\" > t; mv t " $1}' | bash

# Fix version
# grep -l "XXXXXXXXXXXXX.X" dist/* | awk '{print "cat " $1 " | sed \"s/XXXXXXXXXXXXX.X/1.0.1/g\" > t; mv t " $1}' | bash

cd dist
echo "/**
 * FPocketWeb Copyright 2022 Jacob Durrant
 *
 * Licensed under the Apache License, Version 2.0 (the \"License\");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an \"AS IS\" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/" > t
ls FpocketWeb*js | awk '{print "cat t > " $1 ".tmp; cat " $1 " >> " $1 ".tmp; mv " $1 ".tmp " $1}' | bash
rm t
cd -

# Remove old destination and move this one there
rm -rf ../../../../libs/ToCopy/fpocketweb
mv dist ../../../../libs/ToCopy/fpocketweb

#echo "Beep" | festival --tts
