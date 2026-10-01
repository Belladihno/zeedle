import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackWebhookData {
  reference: string;
  amount: number;
  customer: { email: string };
  id: number;
}

@Injectable()
export class PaystackClient {
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    this.http = axios.create({
      baseURL: config.get<string>('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
      headers: { Authorization: `Bearer ${config.getOrThrow<string>('PAYSTACK_SECRET')}` },
      timeout: 15000,
    });
    axiosRetry(this.http, { retries: 2 });
  }

  async initializeTransaction(
    email: string,
    amountKobo: number,
    reference: string,
  ): Promise<PaystackInitResponse> {
    const { data } = await this.http.post('/transaction/initialize', {
      email,
      amount: amountKobo,
      reference,
    });
    return data.data as PaystackInitResponse;
  }
}
