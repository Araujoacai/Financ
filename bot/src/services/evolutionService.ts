import axios from 'axios';
import { config } from '../config/env.js';

export class EvolutionService {
  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': config.evolution.apiKey,
    };
  }

  /**
   * Send WhatsApp text message via Evolution API
   */
  static async sendMessage(remoteJidOrNumber: string, text: string): Promise<boolean> {
    const instance = config.evolution.instanceName;
    const url = `${config.evolution.apiUrl}/message/sendText/${instance}`;

    // Normalize number or JID
    let number = remoteJidOrNumber;
    if (number.includes('@s.whatsapp.net')) {
      number = number.replace('@s.whatsapp.net', '');
    }

    try {
      const response = await axios.post(
        url,
        {
          number,
          text,
          delay: 500,
          linkPreview: false
        },
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (e: any) {
      console.error('[EvolutionService] Error sending WhatsApp message:', e?.response?.data || e?.message);
      return false;
    }
  }

  /**
   * Check connection state of Evolution API instance
   */
  static async getConnectionState(): Promise<{ state: string; instance: string }> {
    const instance = config.evolution.instanceName;
    const url = `${config.evolution.apiUrl}/instance/connectionState/${instance}`;

    try {
      const res = await axios.get(url, { headers: this.getHeaders(), timeout: 5000 });
      return { state: res.data?.instance?.state || 'disconnected', instance };
    } catch (e: any) {
      return { state: 'unreachable', instance };
    }
  }

  /**
   * Configure Webhook on Evolution API for the instance
   */
  static async setupWebhook(webhookUrl: string): Promise<boolean> {
    const instance = config.evolution.instanceName;
    const url = `${config.evolution.apiUrl}/webhook/set/${instance}`;

    try {
      await axios.post(
        url,
        {
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            events: [
              'MESSAGES_UPSERT',
              'CONNECTION_UPDATE'
            ]
          }
        },
        { headers: this.getHeaders(), timeout: 5000 }
      );
      console.log(`[EvolutionService] Webhook configured for ${instance} -> ${webhookUrl}`);
      return true;
    } catch (e: any) {
      console.warn('[EvolutionService] Could not auto-setup webhook:', e?.message);
      return false;
    }
  }
}
