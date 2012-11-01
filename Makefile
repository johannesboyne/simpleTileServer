install: 
	sudo apt-get install g++ curl libssl-dev apache2-utils
	sudo apt-get install libcairo2-dev
	npm install

run: 
	node tileServer.js

.PHONY: run