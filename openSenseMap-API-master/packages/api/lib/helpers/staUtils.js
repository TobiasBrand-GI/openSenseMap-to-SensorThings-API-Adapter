'use strict';

const config = require('config');
const fs = require('fs');
//const axios = require('axios');
const datastream_ref_path = './datastream_reference.json';
const dummy_measurement = {
  _id: { '$oid': '62f13d3d7829f179c4333d49' }, value: '1.67', location: [7.569078, 51.994149], createdAt: '2022-08-08T16:26:34.815Z', sensor_id: { $oid: '5b3e7f6f5dc1ec001be11cf6' }
};

/**
 * Calls the box transformation either for all boxes or one specific box.
 * @param {JSON} data Boxes from the openSenseMap API
 * @param {String} id ID of the specifically selected box. If empty or null all boxes are transformed.
 * @returns Array of transformed JSON Objects.
 */
const transformBoxes = function transformBoxes (data, id) {
  if (id === '' || id === {} || id === null) {
    const allBoxes = [];
    let i = 0;
    while (i < data.length) {
      allBoxes.push(transformOneBox(data[i]));
      ++i;
    }

    return allBoxes;
  }

  return transformOneBox(data);
};

/**
 * Takes a box entity from the OSeM database and converts it into a SensorThings API confirm Thing-Object.
 * @param {JSON} box The box enitity to be converted in SensorThings API confirm JSON-Structure.
 * @returns The converted box as a JSON Object.
 */
const transformOneBox = function transformOneBox (box) {
  const newBox = {};
  newBox['@iot.id'] = box._id;
  newBox['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Things(${box._id})`;
  newBox['Locations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${box._id})/Locations`;
  newBox['HistoricalLocations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${box._id})/HistoricalLocations`;
  newBox['Datastreams@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${box._id})/Datastreams`;
  newBox['name'] = box.name;
  newBox['description'] = box.description ? box.description : '';
  newBox['properties'] = { 'lastMeasurementAt': box.lastMeasurementAt, 'exposure': box.exposure, 'createdAt': box.createdAt, 'model': box.model,
    'updatedAt': box.updatedAt, 'grouptag': box.grouptag };

  return newBox;
};


/**
 * Creates a Location entity according to SensorThings API Standards
 * @param {GeoJSON} location Expects a GeoJSON feature, structured like {type, coordinates [long, lat]}
 * @returns a JSON feature Location
 */
const createSTALocation = function createSTALocation (location) {
  const staLoc = {};
  staLoc['@iot.id'] = Date.now();
  staLoc['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})`;
  staLoc['Things@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})/Things`;
  staLoc['HistoricalLocations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})/HistoricalLocations`;
  staLoc['name'] = '';
  staLoc['description'] = '';
  staLoc['encodingType'] = 'geoJSON';
  staLoc['location'] = { 'type': location.type, 'coordinates': location.coordinates };
  staLoc['properties'] = { 'timestamp': location.timestamp };

  return staLoc;
};

/**
 * Creates a HistoricalLocation entity according to SensorThings API Standards.
 * @param {GeoJSON} location Expects a GeoJSON feature, structured like {type, coordinates [long, lat]}.
 * @returns a JSON feature HistoricalLocation.
 */
const createSTAHistLoc = function createSTAHistLoc (box) {
  const staHist = {};
  staHist['@iot.id'] = Date.now();
  staHist['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/HistoricalLocations(${staHist['@iot.id']})`;
  staHist['Things@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/HistoricalLocations(${staHist['@iot.id']})/Things`;
  staHist['HistoricalLocations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/HistoricalLocations(${staHist['@iot.id']})/Locations`;
  staHist['time'] = box.currentLocation.timestamp;

  const temp = {};
  temp['value'] = [staHist];

  return temp;
};

/**
* Calls Datastream Creation depending on input parameter "specific".
 * @param {JSON} data JSON containing boxes for which the the features the Datastreams are created for.
 * @param {Boolean} specific Value to decide wether the datastreams are for Things, Sensors etc.
 * @returns JSON Datastream features
 */
const createSTADatastream = function createSTADatastream (data, specific, id) {
  const returnString = [];
  if (specific === 'thing') {
    for (let i = 0; i < data.sensors.length; ++i) {
      returnString.push(createOneDatastream(data.sensors[i], data._id));
    }
  } else if (specific === 'sensor') {
    let i = 0;
    while (i < data.length) {
      for (let j = 0; j < data[i].sensors.length; ++j) {
        if (data[i].sensors[j]._id === id) {
          returnString.push(createOneDatastream(data[i].sensors[j], data[i]._id));
        }
      }
      ++i;
    }
  } else if (specific === 'datastream') {
    let i = 0;
    while (i < data.length) {
      for (let j = 0; j < data[i].sensors.length; ++j) {
        if (data[i].sensors[j]._id === id.sensor_id && data[i]._id === id.box_id) {
          returnString.push(createOneDatastream(data[i].sensors[j], data[i]._id));
        }
      }
      ++i;
    }
  }

  return returnString;
};

/**
 * Creates a JSON Datastream from a given sensor.
 * @param {JSON} sensor JSON Object of a sensor from the openSenseMap API.
 * @returns JSON Object.
 */
const createOneDatastream = function createOneDatastream (sensor, boxID) {
  let allreadyExists = false;
  let existingID = '';
  const refData = JSON.parse(fs.readFileSync(datastream_ref_path, { encoding: 'utf8', flag: 'r' }));
  if (refData.references.length > 0) {
    let i = 0;
    while (i < refData.references.length) {
      if (refData.references[i].box_id === boxID && refData.references[i].sensor_id === sensor._id) {
        allreadyExists = true;
        existingID = refData.references[i].ds_id;
        i = refData.references.length;
      }
      ++i;
    }
  }
  const staDS = {};
  staDS['@iot.id'] = allreadyExists === true ? existingID : Date.now().toString();
  staDS['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})`;
  staDS['Thing@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Thing`;
  staDS['Sensor@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Sensor`;
  staDS['ObervedProperty@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/ObservedProperty`;
  staDS['Observations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Observations`;
  staDS['name'] = '';
  staDS['description'] = '';
  staDS['unitOfMeasurement'] = createUnitOfMeasurement(sensor);
  staDS['observationType'] = staDS.unitOfMeasurement.name === 'Not Specified' ? 'OM_Observation' : 'OM_Measurement';
  staDS['properties'] = {};
  staDS['observedArea'] = {};
  staDS['phenomenonTime'] = {};
  staDS['resultTime'] = {};

  if (allreadyExists === false) {
    refData.references.push({ ds_id: staDS['@iot.id'], box_id: boxID, sensor_id: sensor._id });
    fs.writeFileSync(datastream_ref_path, JSON.stringify(refData));
  }

  return staDS;
};

/**
 * Handles selfLink and anvigationLinks of a datastream
 * @param {*} boxes all boxes that shall be checked
 * @param {String} datastreamID Datastream ID from request
 * @param {String} mode value to differentiate function calling. Allowed values = thing, sensor, self, property, observation
 * @returns Called Data
 */
const reverseCreateDatastream = function reverseCreateDatastream (boxes, datastreamID, mode) {
  const refData = JSON.parse(fs.readFileSync(datastream_ref_path, { encoding: 'utf8', flag: 'r' }));
  let dsDataset;
  let i = 0;
  while (i < refData.references.length) {
    if (refData.references[i].ds_id === datastreamID) {
      dsDataset = refData.references[i];
      i = refData.references.length;
    }
    ++i;
  }
  let iterator = 0;
  let returnData;
  switch (mode) {
  case 'thing' :
    while (iterator < boxes.length) {
      if (boxes[iterator]._id === dsDataset.box_id) {
        returnData = transformBoxes(boxes[iterator], dsDataset.box_id);
        iterator = boxes.length;
      }
      ++iterator;
    }
    break;
  case 'sensor' :
    returnData = transformSensors(boxes, dsDataset.sensor_id);
    break;
  case 'self' :
    if (datastreamID === '' || datastreamID === undefined) {
      returnData = 'Datastream ID not defined. Please submit a valid Datastream ID!';
    } else {
      returnData = createSTADatastream(boxes, 'datastream', dsDataset);
    }
    break;
  case 'property' :
    returnData = createOneObservedProperty(getAllSensors(boxes, true, dsDataset.sensor_id));
    break;
  case 'observations' :
    returnData = transformOneObservation(dummy_measurement);
    break;
  }

  return returnData;
};

/**
 * Creates the unitsOfMeasurement JSON Object requested for a SensorThings API Datastream
 * @param {JSON} sensor Sensor from the openSenseMap
 * @returns JSON Object
 */
const createUnitOfMeasurement = function createUnitOfMeasurement (sensor) {
  const unit = sensor.unit;
  let string = '';
  const defUrl = 'https://sensors.wiki/unit/detail/';
  switch (unit) {
  case 'µg/m³' :
    string = `{"name": ${'"Microgram per cubic meter"'}, "symbol": "${unit}", "definition": "${defUrl}microgram_per_cubic_meter"}`;
    break;
  case '°C' :
    string = `{"name": ${'"Degree Celsius"'}, "symbol": "${unit}", "definition": "${defUrl}degree_celsius"}`;
    break;
  case '°F' :
    string = `{"name": ${'"Degree Fahrenheit"'}, "symbol": "${unit}", "definition": "${defUrl}degree_fahrenheit"}`;
    break;
  case 'lx' :
    string = `{"name": ${'"Lux"'}, "symbol": "${unit}", "definition": "${defUrl}lux"}`;
    break;
  case 'm/s' :
    string = `{"name": ${'"Meter per second"'}, "symbol": "${unit}", "definition": "${defUrl}meter_per_second"}`;
    break;
  case 'mm' :
    string = `{"name": ${'"Millimeter"'}, "symbol": "${unit}", "definition": "${defUrl}millimeter"}`;
    break;
  case 'ppm' :
    string = `{"name": ${'"Parts per million"'}, "symbol": "${unit}", "definition": "${defUrl}parts_per_million"}`;
    break;
  case 'Pa' :
    string = `{"name": ${'"Pascal"'}, "symbol": "${unit}", "definition": "${defUrl}pascal"}`;
    break;
  case '%' :
    string = `{"name": ${'"Percent"'}, "symbol": "${unit}", "definition": "${defUrl}percent"}`;
    break;
  case 'V' :
    string = `{"name": ${'"Volt"'}, "symbol": "${unit}", "definition": "${defUrl}volt"}`;
    break;
  case 'W/m²' :
    string = `{"name": ${'"Watt per square meter"'}, "symbol": "${unit}", "definition": "${defUrl}watt_per_square_meter"}`;
    break;
  default :
    string = `{"name":  "Not Specified", "symbol": "${unit}", "definition": "${defUrl}not_specified"}`;
  }

  return JSON.parse(string);
};

/**
 * Calls the sensor selection and the transformation of those selected.
 * @param {JSON} data OpenSenseMap Boxes that shall be searched to extract the requested Sensors.
 * @param {String} id the automatically extracted specific sensor id from the URL for one sensor. If empty or null, all Sensors are transformed.
 * @returns JSON Objects of all transformed sensors.
 */
const transformSensors = function transformSensors (data, id) {
  let allSensors;
  if (id === '' || id === {} || id === null) {
    allSensors = getAllSensors(data, false, id);
  } else {
    allSensors = getAllSensors(data, true, id);
  }
  const allSensorsConvert = [];
  let i = 0;
  while (i < allSensors.length) {
    allSensorsConvert.push(transformOneSensor(allSensors[i]));
    ++i;
  }

  return allSensorsConvert;
};

/**
 * Transformes a openSenseMap Sensor into a SensorThings API sensor.
 * @param {JSON} sensor JSON of the sensor to be transformed.
 * @returns Converted JSON Object
 */
const transformOneSensor = function transformOneSensor (sensor) {
  const staSes = {};
  staSes['@iot.id'] = sensor._id;
  staSes['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Sensors(${staSes['@iot.id']})`;
  staSes['Datastreams@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Sensors(${staSes['@iot.id']})/Datastreams`;
  staSes['name'] = sensor.title;
  staSes['description'] = '';
  staSes['encodingType'] = 'HTML';
  staSes['metadata'] = createMetadatLink(sensor.sensorType);
  staSes['properties'] = { 'unit': sensor.unit, 'sensorType': sensor.sensorType, 'lastMeasurement': sensor.lastMeasurement };

  return staSes;
};

/**
 * Creates the metadata link requested for a valid SensorThings API sensor.
 * @param {String} type SensorType of the specific sensor.
 * @returns String containing the URL or an error message.
 */
const createMetadatLink = function createMetadatLink (type) {
  const typeArray = ['AS7262', 'BME280', 'BME680', 'BMP085', 'BMP180', 'BMP280', 'CSM-M8Q', 'DHT11', 'DHT22', 'DS18B20', 'DS18S20', 'GL5528', 'Grove - Multichannel Gas Sensor', 'HDC1008', 'HDC1080', 'HM3301', 'HPM', 'HTU21D', 'LM35', 'LM386', 'MAX4465', 'NEO-6M', 'NO2-A43F', 'Optical Rain Gauge RG 15', 'OX-A431', 'PMS1003', 'PMS3003', 'PMS5003', 'PMS6003', 'PMS7003', 'PPD42NS', 'SBM-19', 'SBM-20', 'SCD30', 'SDS011', 'SDS021', 'SEN0232', 'SHT10', 'SHT11', 'SHT15', 'SHT30', 'SHT31', 'SHT35', 'SHT85', 'SI22G', 'SMT50', 'SPS30', 'TSL2561', 'TSL4531', 'TX20', 'VEML6070V2'];
  if (typeArray.includes(type)) {
    if (type === 'Grove - Multichannel Gas Sensor') { return 'https://sensors.wiki/sensor/detail/grove_-_multichannel_gas_sensor'; }
    if (type === 'Optical Rain Gauge RG 15') { return 'https://sensors.wiki/sensor/detail/optical_rain_gauge_rg_15'; }

    return `https://sensors.wiki/sensor/detail/${type}`.toLocaleLowerCase();
  }

  return 'This sensor does not have a metadata representation available.';
};

/**
 * Iterates through all boxes send in the data parameter to select the sensors.
 * @param {JSON} data Boxes containing the sensors.
 * @param {Boolean} single If false, all unique sensors are selected. If true, the sensor matching the id param is selected.
 * @param {String} id The id of the requested sensor, if only one should be considered.
 * @returns All selected sensors.
 */
const getAllSensors = function getAllSensors (data, single, id) {
  const diffSensors = [];
  if (single === false) {
    const diffSensorsControll = [];
    let i = 0;
    while (i < data.length) {
      for (let j = 0; j < data[i].sensors.length; ++j) {
        const sensor = data[i].sensors[j];
        const controllStr = `${sensor.sensorType}${sensor.unit}`;
        if (!diffSensorsControll.includes(controllStr)) {
          diffSensorsControll.push(controllStr);
          diffSensors.push(sensor);
        }
      }
      ++i;
    }
  } else if (single === true) {
    let i = 0;
    while (i < data.length) {
      for (let j = 0; j < data[i].sensors.length; ++j) {
        const sensor = data[i].sensors[j];
        if (sensor._id === id) {
          diffSensors.push(sensor);
          break;
        }
      }
      ++i;
    }
  }

  return diffSensors;
};

/**
 * Selects a single Attribute or value to return
 * @param {} item Item containing the attribute
 * @param {*} attribute Name of attribute
 * @param {Boolean} valueOnly if true, value nly will be returned
 * @returns Data
 */
const selectAttribute = function selectAttribute (item, attribute, valueOnly) {
  if (item[attribute] !== undefined) {
    if (valueOnly === true) {

      return item[attribute];
    }

    return JSON.parse(`{"${attribute}": "${item[attribute]}"}`);
  }

  return 'Attribute does not exist.';
};


// const transformObservations = function transformObservations (measurements) {
//   const returnArray = [];
//   for (let i = 0; i < measurements.length; ++i) {
//     returnArray.push(transformOneObservation(measurements[i]));
//   }

//   return returnArray;
// };

/**
 * Transforms a measurement into a STA Observation
 * @param {*} measurement to be transformed
 * @returns transformed measurement
 */
const transformOneObservation = function transformOneObservation (measurement) {
  const staMeasure = {};
  staMeasure['@iot.id'] = `${Date.now()}_DummyObservation`;
  staMeasure['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Observations(${staMeasure['@iot.id']})`;
  staMeasure['Datastream@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Observations(${staMeasure['@iot.id']})/Datastream`;
  staMeasure['FeatureOfInterest@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Observations(${staMeasure['@iot.id']})/FeatureOfInterest`;
  staMeasure['phenomenonTime'] = measurement.createdAt;
  staMeasure['result'] = measurement.value;
  staMeasure['resultTime'] = measurement.createdAt;
  staMeasure['resultQuality'] = {};
  staMeasure['validTime'] = '';
  staMeasure['parameters'] = {};

  return staMeasure;
};

/**
 * Creates a STA ObservedProperty from sensor data
 * @param {*} sensor containing the data.
 * @returns ObservedProperty object
 */
const createOneObservedProperty = function createOneObservedProperty (sensor) {
  const staProp = {};
  staProp['@iot.id'] = Date.now();
  staProp['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/ObservedProperties(${staProp['@iot.id']})`;
  staProp['Datastreams@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/ObservedProperties(${staProp['@iot.id']})/Datastream`;
  staProp['phenomenonTime'] = '';
  staProp['name'] = '';
  staProp['definition'] = createUnitOfMeasurement(sensor).definition;
  staProp['properties'] = {};

  return staProp;
};

/**
 * Creates a STA FeatureOfInterest from measurement data
 * @param {*} measurement containing the data.
 * @returns FeatureOfInterest object
 */
const createOneFeatureOfInterest = function createOneFeatureOfInterest (measurement) {
  const staFeat = {};
  staFeat['@iot.id'] = Date.now();
  staFeat['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/FeaturesOfInterest(${staFeat['@iot.id']})`;
  staFeat['Datastreams@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/FeaturesOfInterest(${staFeat['@iot.id']})/Observations`;
  staFeat['name'] = '';
  staFeat['description'] = '';
  staFeat['encodingType'] = 'GeoJSON';
  staFeat['feature'] = `{"type": "Point", "coordinates":${measurement.location}}`;
  staFeat['properties'] = {};

  return staFeat;
};

// const getMeasurements = function getMeasurements (box_id, sensor_id) {
//   return axios
//     .get(`https://api.opensensemap.org/boxes/${box_id}/data/${sensor_id}`)
//     .then(response => {
//       this.resData = response.data;
//     })
//     .catch(error => {
//       this.resData = `No measurements found ${error}`;
//     });
// };

module.exports = {
  transformBoxes,
  createSTALocation,
  createSTAHistLoc,
  createSTADatastream,
  reverseCreateDatastream,
  transformSensors,
  selectAttribute,
  createOneFeatureOfInterest,
  dummy_measurement
};
