python3 validate.py && python3 add_plugins.py

echo "Creating HOW_TO_MAKE_A_PLUGIN.md"
python3 make_plugin_docs.py > ../src/Plugins/HOW_TO_MAKE_A_PLUGIN.md
echo

echo "UNUSED EXPORTS:"
cd ../
node_modules/ts-unused-exports/bin/ts-unused-exports tsconfig.json $(find src/ -type f | grep -v "\.old" | grep "\.ts\|\.vue") | grep -v ": default$"
cd -

echo

# Get current date and time as string. Include time zone, and use current
# system's time zone.
now=$(date +"%Y-%m-%d %H:%M %Z")
# now=$(date +"%Y-%m-%d %H:%M")
now_hash=$(echo $now | md5sum | cut -d " " -f 1)

# Create a json file with this information
echo "{\"date\": \"$now\", \"hash\": \"$now_hash\"}" > ../src/last_updated.json