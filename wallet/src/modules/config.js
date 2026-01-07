import {NativeModules} from 'react-native';

const relayEndpoint = NativeModules?.TokpayConfig?.relayEndpoint;

const Config = {
  RELAY_ENDPOINT: typeof relayEndpoint === 'string' && relayEndpoint.length > 0 ? relayEndpoint : null,
};

export default Config;
