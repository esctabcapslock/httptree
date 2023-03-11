cp ./package.json ./lib/package.json
cp ./readme.md ./lib/readme.md
cd ./lib
echo "Upload Check"
npm publish --dry-run 
