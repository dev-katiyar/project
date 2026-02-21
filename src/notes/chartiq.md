npm uninstall chartiq

move the tar ball file provided by cosaic into the project root folder

npm install chartiq-8.6.0.tgz use the correct file name based on the version.

Workaround for webpack 5 issue: Remove webpack5 realted elif statements from following files

node_modules/chartiq/examples/markers/markersSample.js
node_modules/chartiq/examples/markers/tradeAnalyticsSample.js
node_modules/chartiq/examples/markers/videoSample.js
workaround for 'All' option of data in chart UI:

go to file 'node_modules/chartiq/js/defaultConfiguration.js'
update the cmd prop of rangeMenu object, in line with 5 year cmd righat above that line. i.e. 1cmd: "set(40,'year')"