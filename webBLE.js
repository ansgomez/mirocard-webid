window.addEventListener('DOMContentLoaded', function() {
const searchParams = new URL(location).searchParams;
const inputs = Array.from(document.querySelectorAll('input[id]'));

inputs.forEach(input => {
  if (searchParams.has(input.id)) {
    if (input.type == 'checkbox') {
      input.checked = searchParams.get(input.id);
    } else {
      input.value = searchParams.get(input.id);
      input.blur();
    }
  }
  if (input.type == 'checkbox') {
    input.addEventListener('change', function(event) {
      const newSearchParams = new URL(location).searchParams;
      if (event.target.checked) {   
        newSearchParams.set(input.id, event.target.checked);
      } else {
        newSearchParams.delete(input.id);
      }
      history.replaceState({}, '', Array.from(newSearchParams).length ?
          location.pathname + '?' + newSearchParams : location.pathname);
    });
  } else {
    input.addEventListener('input', function(event) {
      const newSearchParams = new URL(location).searchParams;
      if (event.target.value) {
        newSearchParams.set(input.id, event.target.value);
      } else {
        newSearchParams.delete(input.id);
      }
      history.replaceState({}, '', Array.from(newSearchParams).length ?
          location.pathname + '?' + newSearchParams : location.pathname);
    });
  }
});
});



var ChromeSamples = {
log: function() {
  var line = Array.prototype.slice.call(arguments).map(function(argument) {
    return typeof argument === 'string' ? argument : JSON.stringify(argument);
  }).join(' ');

  document.querySelector('#log').textContent += line + '\n';
},

clearLog: function() {
  document.querySelector('#log').textContent = '';
},

setStatus: function(status) {
  document.querySelector('#status').textContent = status;
},

setContent: function(newContent) {
  var content = document.querySelector('#content');
  while(content.hasChildNodes()) {
    content.removeChild(content.lastChild);
  }
  content.appendChild(newContent);
}
};

function printMiroCardData(temperature, humidity) {
    var card_header = `
    <div class="card" style="width:150px">
      <p class="aligncenter">
      <img src="img/profile_ag.png" alt="Avatar" style="width:150px">
      </p>
      <div class="container">
		  <h2 style="font-size: 25px;"><b>Andres Gomez</b></h2>  <br>
        <p style="font-size: 20px;"> <b>Sensor:</b>
    `;
    var card_sensordata = "&nbsp;&nbsp;" +  temperature + "&#176;C " + "&nbsp;&nbsp;" + humidity + "%";
	
	var info = ''
	
    var card_footer = `
        </p> 
      </div>
    </div>
    `;
	
	var greeting = "";

    timeToDelete = new Date().getTime() + 5000;

    document.getElementById("sensor_data").innerHTML = card_header + greeting + info +  card_sensordata + card_footer;
}

  

// check for stale data
var timeToDelete;

var intervalId = setInterval(function() {
if ( timeToDelete - new Date().getTime() < 0) {
  document.getElementById("sensor_data").innerHTML = "";
}
}, 5000);


// Debugging 
var DEBUG = false; // true when debugging
function PRINTF( msg ){ log(msg) }

async function onButtonClick() {
let filters = [];

let filterName = document.querySelector('#name').value;
if (filterName) {
  filters.push({name: filterName});
}

let filterNamePrefix = document.querySelector('#namePrefix').value;
if (filterNamePrefix) {
  filters.push({namePrefix: filterNamePrefix});
}

let options = {};
if (document.querySelector('#allAdvertisements').checked) {
  options.acceptAllAdvertisements = true;
} else {
  options.filters = filters;
}

try {
  log('Requesting Bluetooth Scan with options: ' + JSON.stringify(options));
  const scan = await navigator.bluetooth.requestLEScan(options);

  log('Scan started with:');
  log(' acceptAllAdvertisements: ' + scan.acceptAllAdvertisements);
  log(' active: ' + scan.active);
  log(' keepRepeatedDevices: ' + scan.keepRepeatedDevices);
  log(' filters: ' + JSON.stringify(scan.filters));

  navigator.bluetooth.addEventListener('advertisementreceived', event => {
    let hexString = "";
    event.manufacturerData.forEach((valueDataView, key) => {
        hexString = [...new Uint8Array(valueDataView.buffer)].map(b => {
          return b.toString(16).padStart(2, '0');
        }).join(' ');

        //log(hexString +'\n');  
    });

    //log(hexString.substring(0,8))

    if(hexString.substring(0,8)=="02 03 04") 
    {
      let manu = hexString.replace(/\s+/g, '');
      let encryptedBytes=hexStringToUint8Array(manu.substring(6)); // start after 020304
      let key=hexStringToUint8Array('000102030405060708090a0b0c0d0e0f');
      let aes=new aesjs.ModeOfOperation.ecb(key);
      let decrypted=aes.decrypt(encryptedBytes);


      let humidity_raw = ((decrypted[1]&0x03)<<8) + decrypted[0];
      let temperature_raw = (decrypted[2]<<6) + ((decrypted[1]&0xFC)>>2);

      // conversion
      let temperature = (-40.0 + temperature_raw / 100.0).toFixed(1);
      let humidity =  (humidity_raw / 10.0).toFixed(1);

      let deviceId=[decrypted[3],decrypted[4],decrypted[5],decrypted[6],decrypted[7],decrypted[8]].map(
        function(n){return n.toString(16).padStart(2,'0')}
      ).join('');


      log('MiroCard beacon.');
      //{% comment %} log('  Device Name: ' + event.device.name); {% endcomment %}
      //{% comment %} log('  Device ID: ' + event.device.id); {% endcomment %}
      log('  Temp: ' + temperature);
      log('  RH: ' + humidity);
      log('DevID: ' + deviceId);
      log('  RSSI: ' + event.rssi);
      //log('  TX Power: ' + event.txPower);
      //log('  UUIDs: ' + event.uuids);
      //event.manufacturerData.forEach((valueDataView, key) => {
      //  logDataView('Manufacturer', key, valueDataView);
      //});
      //event.serviceData.forEach((valueDataView, key) => {
      //  logDataView('Service', key, valueDataView);
      //});

	  printMiroCardData(temperature, humidity);

    }
  });

  setTimeout(stopScan, 100000);
  function stopScan() {
    log('Stopping scan...');
    scan.stop();
    log('Stopped.  scan.active = ' + scan.active);
  }
} catch(error)  {
  log('Argh! ' + error);
}
}

/* Utils */

const logDataView = (labelOfDataSource, key, valueDataView) => {
const hexString = [...new Uint8Array(valueDataView.buffer)].map(b => {
  return b.toString(16).padStart(2, '0');
}).join(' ');
const textDecoder = new TextDecoder('ascii');
const asciiString = textDecoder.decode(valueDataView.buffer);
log(`  ${labelOfDataSource} Data: ` + key +
    '\n    (Hex) ' + hexString +
    '\n    (ASCII) ' + asciiString);
};
function hexStringToUint8Array(hex) {
	return new Uint8Array(hex.match(/[0-9a-fA-F]{2}/g).map(function(n){return parseInt(n,16)}))
}


log = ChromeSamples.log;

function isWebBluetoothEnabled() {
if (navigator.bluetooth) {
  return true;
} else {
  ChromeSamples.setStatus('Web Bluetooth API is not available.\n' +
      'Please make sure the "Experimental Web Platform features" flag is enabled.');
  return false;
}
}
