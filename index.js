#!/usr/bin/env node
;(function() {
  const exec = require('child_process').exec;

  /**
   * Gets list of available devices to simulate
   *
   * @function getDeviceList
   * @return {promise} resolves as list of devices
   */
  function getDeviceList() {
    return new Promise((resolve, reject) => {
      exec("xcrun simctl list", function(err, stdout) {
        if (err) { return reject(err); }
        const devicesStart = stdout.indexOf('== Devices ==');
        const devicesEnd = stdout.indexOf('== Device Pairs ==');
        const devices = stdout
          .slice(devicesStart, devicesEnd)
          .split('\n')
          .filter(line => line.indexOf('--') === -1)
          .slice(1)
          .map((line) => {
            const idMatch = line.match(/(([\d\w]{0,20}-[\d\w]{0,20}){3,})/)
            if (idMatch) {
              return {
                value: idMatch[0],
                name: line.slice(0, idMatch.index - 1).trim()
              }
            }
            return null
          })
          .filter(item => !!item)
          resolve(devices)
      });
    })
  }

  /**
   * Gets list of available devices to simulate
   *
   * @async
   * @function tryGetDeviceList
   * @return {array} list of device objects { value(id), name }
   */
  async function tryGetDeviceList() {
    try {
      return await getDeviceList();
    } catch (err) {
      console.log('Error: unable to get device list...\nplease make sure you have installed additional components in Xcode\n');
      console.log(err.message);
      process.exit();
    }
  }

  /**
   * Gets the path to the user's node modules
   *
   * @function getNodeModulePrefix
   * @return {promise} resolves as node module prefix
   */
  function getNodeModulePrefix() {
    return new Promise((resolve, reject) => {
      exec('npm config -g get prefix', (err, prefix) => {
        if (err) { return reject(err); }
        resolve(`${prefix.trim()}/lib/node_modules/`);
      })
    })
  }

  /*
   * Get's the path to the user's node modules
   *
   * @async
   * @function tryGetNodeModulePrefix
   * @return {string} node module prefix
   */
  async function tryGetNodeModulePrefix() {
    try {
      return await getNodeModulePrefix();
    } catch (err) {
      console.log('Error: unable to get node_module prefix. Do you have npm installed?')
      console.log(err) // eslint-disable-line no-console
      process.exit();
    }
  }

  /*
   * Attempt a node module require
   *
   * @async
   * @function tryRequire
   * @param {string} package - package name
   * @return {string} node module prefix
   */
  async function tryRequire(package) {
    const prefix = await tryGetNodeModulePrefix();
    try {
      return require(`${prefix}/${package}`);
    } catch (err) {
      console.log(`Error: Please run 'npm install -g ${package}' to continue`);
      process.exit();
    }
  }

  /*
   * Boot a simulated device
   *
   * @function bootDevice
   * @param {string} id - device id
   * @return {promise}
   */
  function bootDevice(id) {
    return new Promise((resolve, reject) => {
      exec(`xcrun simctl boot ${id}` , (err) => {
        if (err) { return reject(err); }
        resolve(true)
      })
    })
  }

  /*
   * Launch a booted simulated device
   *
   * @function launchDevice
   * @param {string} id - device id
   * @return {promise}
   */
  function launchDevice(id) {
    return new Promise((resolve, reject) => {
      exec(`open -a "Simulator" --args -CurrentDeviceUDID ${id}`, (err) => {
        if (err) { return reject(err) }
        resolve(id)
      })
    })
  }

  /*
   * Calls functions to boot and launch a device
   *
   * @async
   * @function startDevice
   * @param {string} id - device id
   */
  async function startDevice(id) {
    try {
      await bootDevice(id);
    } catch (err) {
      if (err.message.indexOf('state: Booted')) {
        // do nothing
      } else {
        console.log('Error: unable to boot device...\nplease make sure you have installed additional components in Xcode\n\n');
        console.log(err);
        process.exit()
      }
    }
    try {
      await launchDevice(id);
    } catch (err) {
      console.log('Error: unable to launch device, xcode 7 or more required');
      console.log(err);
      process.exit();
    }
  }

  /*
   * prompts user to select a device to simulate
   *
   * @async
   * @function inquireDevice
   * @param {array} devices - array of device objects { name, value(id) }
   * @return {promise} - resolves to the selected device
   */
  async function inquireDevice(devices) {
    const inquirer = await tryRequire('inquirer');
    return new Promise((resolve, reject) => {
      inquirer.prompt([
        {
          type: 'list',
          name: 'device',
          message: 'Please choose a device',
          choices: devices
        }
      ])
        .then(res => {
          resolve(res.device)
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  /*
   * handles promise from inquireDevice
   *
   * @async
   * @function tryInquireDevices
   * @param {array} devices - array of device objects { name, value(id) }
   * @return {string} device id
   */
  async function tryInquireDevices(devices) {
    try {
      return await inquireDevice(devices);
    } catch (err) {
      console.log('Error: there was an error recieving your choice\n', err.message)
    }
  }

  /*
   * main script to start simulator
   *
   * @async
   * @function init
   */
  async function init() {
    const devices = await tryGetDeviceList();
    const id = await tryInquireDevices(devices);
    startDevice(id)
  }

  init();
}())