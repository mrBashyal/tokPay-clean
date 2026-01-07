package com.wallet

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

@SuppressLint("MissingPermission")
class TokpayBlePeripheralModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TokpayBlePeripheral"
        private const val EVENT_TOKEN_RECEIVED = "onTokenReceived"
        private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private val CHARACTERISTIC_UUID: UUID = UUID.fromString("0000ffe1-0000-1000-8000-00805f9b34fb")
    }

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null
    private var isAdvertising = false
    private var connectedDevice: BluetoothDevice? = null
    private var serviceUuid: UUID? = null
    private var startAdvertisingPromise: Promise? = null

    override fun getName(): String = "TokpayBlePeripheral"

    override fun initialize() {
        super.initialize()
        bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
        advertiser = bluetoothAdapter?.bluetoothLeAdvertiser
    }

    override fun invalidate() {
        stopAdvertisingInternal()
        closeGattServer()
        super.invalidate()
    }

    @ReactMethod
    fun startAdvertising(serviceUuidString: String, promise: Promise) {
        try {
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                promise.reject("BLE_DISABLED", "Bluetooth is not enabled")
                return
            }

            if (advertiser == null) {
                promise.reject("BLE_NOT_SUPPORTED", "BLE advertising not supported on this device")
                return
            }

            if (isAdvertising) {
                promise.resolve(true)
                return
            }

            serviceUuid = UUID.fromString(serviceUuidString)

            // Store promise to resolve after service is added
            startAdvertisingPromise = promise

            if (!setupGattServer()) {
                startAdvertisingPromise = null
                promise.reject("GATT_FAILED", "Failed to setup GATT server")
                return
            }

            // Don't resolve promise yet - wait for onServiceAdded callback

        } catch (e: Exception) {
            Log.e(TAG, "Error starting advertising", e)
            promise.reject("START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            stopAdvertisingInternal()
            closeGattServer()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping advertising", e)
            promise.reject("STOP_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun sendAck(dataBase64: String, promise: Promise) {
        try {
            val device = connectedDevice
            val server = gattServer
            val uuid = serviceUuid

            if (device == null || server == null || uuid == null) {
                promise.reject("NOT_CONNECTED", "No device connected or GATT server not ready")
                return
            }

            val service = server.getService(uuid)
            val characteristic = service?.getCharacteristic(CHARACTERISTIC_UUID)

            if (characteristic == null) {
                promise.reject("CHAR_NOT_FOUND", "Characteristic not found")
                return
            }

            val data = Base64.decode(dataBase64, Base64.NO_WRAP)

            val success = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val result = server.notifyCharacteristicChanged(device, characteristic, false, data)
                result == BluetoothGatt.GATT_SUCCESS
            } else {
                @Suppress("DEPRECATION")
                characteristic.value = data
                @Suppress("DEPRECATION")
                server.notifyCharacteristicChanged(device, characteristic, false)
            }

            if (success) {
                promise.resolve(true)
            } else {
                promise.reject("NOTIFY_FAILED", "Failed to send notification")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error sending ack", e)
            promise.reject("SEND_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    private fun setupGattServer(): Boolean {
        val uuid = serviceUuid ?: return false

        gattServer = bluetoothManager?.openGattServer(reactApplicationContext, gattServerCallback)
        if (gattServer == null) {
            Log.e(TAG, "Failed to open GATT server")
            return false
        }

        val service = BluetoothGattService(uuid, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        val characteristic = BluetoothGattCharacteristic(
            CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE or
                    BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or
                    BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        val descriptor = BluetoothGattDescriptor(
            CCCD_UUID,
            BluetoothGattDescriptor.PERMISSION_WRITE or BluetoothGattDescriptor.PERMISSION_READ
        )
        characteristic.addDescriptor(descriptor)

        service.addCharacteristic(characteristic)

        val added = gattServer?.addService(service) ?: false
        Log.d(TAG, "GATT service added: $added")
        return added
    }

    private fun stopAdvertisingInternal() {
        if (isAdvertising) {
            try {
                advertiser?.stopAdvertising(advertiseCallback)
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping advertiser", e)
            }
            isAdvertising = false
            Log.d(TAG, "Stopped advertising")
        }
    }

    private fun closeGattServer() {
        try {
            gattServer?.close()
            gattServer = null
            connectedDevice = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing GATT server", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            isAdvertising = true
            Log.d(TAG, "Advertising started successfully")
            startAdvertisingPromise?.resolve(true)
            startAdvertisingPromise = null
        }

        override fun onStartFailure(errorCode: Int) {
            isAdvertising = false
            Log.e(TAG, "Advertising failed with error code: $errorCode")
            startAdvertisingPromise?.reject("ADVERTISE_FAILED", "Advertising failed with code: $errorCode")
            startAdvertisingPromise = null
        }
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {

        override fun onServiceAdded(status: Int, service: BluetoothGattService?) {
            super.onServiceAdded(status, service)
            
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.d(TAG, "GATT service added successfully, starting advertising")
                
                val settings = AdvertiseSettings.Builder()
                    .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                    .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                    .setConnectable(true)
                    .setTimeout(0)
                    .build()

                val data = AdvertiseData.Builder()
                    .setIncludeDeviceName(false)
                    .addServiceUuid(ParcelUuid(serviceUuid))
                    .build()

                val scanResponse = AdvertiseData.Builder()
                    .setIncludeDeviceName(true)
                    .build()

                advertiser?.startAdvertising(settings, data, scanResponse, advertiseCallback)
                
                // Will resolve promise in advertiseCallback.onStartSuccess
            } else {
                Log.e(TAG, "Failed to add GATT service, status: $status")
                startAdvertisingPromise?.reject("GATT_SERVICE_FAILED", "Failed to add GATT service")
                startAdvertisingPromise = null
            }
        }

        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            super.onConnectionStateChange(device, status, newState)

            if (newState == BluetoothProfile.STATE_CONNECTED) {
                connectedDevice = device
                Log.d(TAG, "Device connected: ${device.address}")
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                connectedDevice = null
                Log.d(TAG, "Device disconnected: ${device.address}")
            }
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            super.onCharacteristicWriteRequest(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value)

            Log.d(TAG, "Characteristic write request received from ${device.address}")
            Log.d(TAG, "  requestId=$requestId, preparedWrite=$preparedWrite, responseNeeded=$responseNeeded, offset=$offset")
            Log.d(TAG, "  value size: ${value?.size ?: 0} bytes")

            // Always send response first if needed
            if (responseNeeded) {
                val result = gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                Log.d(TAG, "  sendResponse result: $result")
            }

            if (value != null && value.isNotEmpty()) {
                val base64Data = Base64.encodeToString(value, Base64.NO_WRAP)
                Log.d(TAG, "  Emitting event with base64 data length: ${base64Data.length}")
                val params = Arguments.createMap().apply {
                    putString("deviceId", device.address)
                    putString("data", base64Data)
                    putInt("length", value.size)
                }
                sendEvent(EVENT_TOKEN_RECEIVED, params)
            }
        }

        override fun onDescriptorWriteRequest(
            device: BluetoothDevice,
            requestId: Int,
            descriptor: BluetoothGattDescriptor,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            super.onDescriptorWriteRequest(device, requestId, descriptor, preparedWrite, responseNeeded, offset, value)

            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
            }
            Log.d(TAG, "Descriptor write request handled")
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            super.onCharacteristicReadRequest(device, requestId, offset, characteristic)
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, byteArrayOf())
        }

        override fun onDescriptorReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            descriptor: BluetoothGattDescriptor
        ) {
            super.onDescriptorReadRequest(device, requestId, offset, descriptor)
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
        }
    }
}
