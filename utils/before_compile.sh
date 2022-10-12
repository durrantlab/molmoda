python3 validate.py && python3 add_plugins.py

echo "Creating HOW_TO_MAKE_A_PLUGIN.md"
python3 make_plugin_docs.py > ../src/Plugins/HOW_TO_MAKE_A_PLUGIN.md
echo
