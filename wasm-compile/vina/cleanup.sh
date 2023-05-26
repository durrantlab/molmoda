echo ""
echo "This will remove all the files the docker container downloads and installed."
echo "It will restore everything to its original state. You will have to download"
echo "and install everything again if you want to generate the demo files."
echo ""

read -p "Are you sure you want to do this? (y/n) " -n 1 -r
echo ""

# If the user typed n, exit.
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    exit 1
fi

sudo rm -rf ./support/AutoDock-Vina-1.2.3 ./support/boost_1_82_0 ./support/emsdk
sudo rm -rf out/
