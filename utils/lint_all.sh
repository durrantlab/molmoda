python3 validate.py

echo "UNUSED EXPORTS:"
cd ../
node_modules/ts-unused-exports/bin/ts-unused-exports tsconfig.json $(find src/ -type f | grep -v "\.old" | grep "\.ts\|\.vue") | grep -v ": default$"
cd -

cd ../
npx eslint "./src/**/{*.ts,*.vue}"
