'use strict';

/**
 * Takes a box entity from the OSeM database and converts it into a SensorThings API confirm Thing-Object.
 * @param {JSON Object} box The box enitity to be converted in SensorThings API confirm JSON-Structure.
 * @returns The converted box as a JSON String.
 */
const transformOneBox = function transformOneBox (box) {
  const old = box;
  const newBox = JSON.parse(JSON.stringify(old).split('"_id":')
    .join('"@iot.id":'));
  newBox['@iot.selflink'] = `localhost:8000/boxes/${old._id}/?sta=auto`;
  newBox['Location@iot.navigationLink'] = `localhost:8000/boxes/${old._id}/Locations?sta=auto`;
  newBox['HistoricalLocation@iot.navigationLink'] = `localhost:8000/boxes/${old._id}/HistoricalLocations?sta=auto`;
  newBox['Datastream@iot.navigationLink'] = `localhost:8000/boxes/${old._id}/Datastreams?sta=auto`;
  delete newBox.name;
  newBox.name = old.name;
  if (old.description) {
    delete newBox.description;
    newBox.description = old.description;
  } else {
    newBox.description = '';
  }
  const properties = [];
  newBox.properties = properties;
  newBox.properties.push(newBox.lastMeasurementAt, newBox.exposure, newBox.createdAt, newBox.model, newBox.updatedAt, newBox.grouptag);
  ['lastMeasurementAt', 'sensors', 'loc', 'currentLocation', 'exposure', 'createdAt', 'model', 'updatedAt', 'grouptag'].forEach(e => delete newBox[e]);

  return JSON.stringify(newBox);
};

module.exports = { transformOneBox };
