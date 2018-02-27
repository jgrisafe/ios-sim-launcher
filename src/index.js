;(function() {
  const promisify = require('util').promisify;
  const exec = promisify(require('child_process').exec);
  const inquirer = require('inquirer');


  /**
   * parses the stdout of the xcru simctl list into an array of device objects
   * { value, name } where value is the device id
   * 
   * @function parseDevices
   * @param {string} stdout - the output of the sim command
   * @returns {array} device objects
   */
  function parseDevices(stdout) {
    const devicesStart = stdout.indexOf('== Devices ==');
    const devicesEnd = stdout.indexOf('== Device Pairs ==');
    return stdout
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
  }

  /**
   * Gets list of available devices to simulate
   *
   * @async
   * @function getDeviceList
   * @return {promise} resolves as list of devices
   */
  async function getDeviceList() {
    try {
      const { stdout } = await exec("xcrun simctl list");
      return parseDevices(stdout);
    } catch (err) {
      console.log('Error: unable to get device list...\nplease make sure you' + 
        'have installed additional components in Xcode\n');
      throw err;
    }
  }

  /**
   * Boot a simulated device
   *
   * @function bootDevice
   * @param {string} id - device id
   * @return {promise}
   */
  function bootDevice(id) {
    return exec(`xcrun simctl boot ${id}`);
  }

  /**
   * Launch a booted simulated device
   *
   * @function launchDevice
   * @param {string} id - device id
   * @return {promise}
   */
  function launchDevice(id) {
    return exec(`open -a "Simulator" --args -CurrentDeviceUDID ${id}`)
  }

  /**
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
        console.log('Error: unable to boot device...\nplease make sure you have' +
          'installed additional components in Xcode\n\n');
        throw err;
      }
    }
    try {
      await launchDevice(id);
    } catch (err) {
      console.log('Error: unable to launch device, xcode 7 or more required');
      throw(err);
    }
  }

  /**
   * prompts user to select a device to simulate
   *
   * @async
   * @function inquireDevice
   * @param {array} devices - array of device objects { name, value(id) }
   * @return {promise} - resolves to the selected device
   */
  async function inquireDevice(devices) {
    return new Promise((resolve, reject) => {

      // not a real promise, so can't be returned directly
      inquirer.prompt([{
          type: 'list',
          name: 'device',
          message: 'Please choose a device',
          choices: devices
        }]).then(res => resolve(res.device)).catch(err => reject(err))
    })
  }

  /**
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

  /**
   * main script to start simulator
   *
   * @async
   * @function init
   */
  async function init() {
    try {
      const devices = await getDeviceList();
      const id = await tryInquireDevices(devices);
      startDevice(id)
    } catch (err) {
      console.log(err.message);
    }
  }

  init().catch(console.error.bind(console));
}())