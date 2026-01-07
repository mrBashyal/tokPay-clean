import Config from './config';
import {serializeToken} from './offlineToken';

export const sendTokenViaRelay = async (token, recipientDeviceId) => {
  if (!Config.RELAY_ENDPOINT) {
    throw new Error('Relay endpoint not configured');
  }
  const tokenPayload = serializeToken(token);
  
  const response = await fetch(`${Config.RELAY_ENDPOINT}/api/relay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientDeviceId,
      payload: tokenPayload,
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Relay failed with status ${response.status}`);
  }

  return true;
};
