* Production build of project `ng build --prod --aot --output-hashing=all`. Out will be in `dist` folder

* Login to remote desktop. Testing Server IP `3.138.80.45`

* ID and Password. `Administrator` & `xxxxxxxxxxxxxxxxxxxxx`

* The folder is `C:\softwares\Apache24\htdocs\mysite\website-latest`

* Delete conent of the remote `website-latest` folder, except `backend` and `assets`

* Copy content of local `dist` folder, except `assets`. Paste in the remote `website-latest` folder.

* Copy and repalce `assets` fodler, if there are chagnes. 

* Copy and replace specific files changed from local `backend` folder to remote `backend` folder. Do *NOT* repalce `MyConfig` file. Do *NOT* ever replce the whole `backend` folder

* `Restart` the Apache Server. `Computer Management > Services > Apache 2.4` (Right click and select restart).

* Test it from local machine using `http://3.138.80.45` and from your local computer using `https://simplevisor.com/`
