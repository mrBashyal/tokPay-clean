package com.wallet

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class TokpayConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "TokpayConfig"

    override fun getConstants(): MutableMap<String, Any?> {
        val constants: MutableMap<String, Any?> = HashMap()
        constants["relayEndpoint"] = BuildConfig.TOKPAY_RELAY_URL
        return constants
    }
}
