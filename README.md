# openSenseMap to SensorThings API Adapter
Additional Software to convert the data from the openSenseMap into the SensorThings API format.


This software was created in the context of a Bachelors Thesis.


This repository mostly consits of the already existing code of the [openSenseMap-API](https://github.com/sensebox/openSenseMap-API). Please follow the steps in their [README](./openSenseMap-API-master/README.md) to set up the system 


For the adapter to work, two files, [staUtils.js](./openSenseMap-API-master/packages/api/lib/helpers/staUtils.js) and [staUrlUtils.js](./openSenseMap-API-master/packages/api/lib/helpers/staUrlUtils.js) needed to be added, aswell as some new [routes](./openSenseMap-API-master/packages/api/lib/routes.js) and a few confiq details in the [default.js](./openSenseMap-API-master/config/default.js). All changes are clearly marked with comments.

A short demo video can be found [here](https://youtu.be/_Z9_0KILSWI).

