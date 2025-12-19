declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    description: string;
    image: string;
    currency: string;
    key: string;
    amount: number;
    order_id?: string;
    name: string;
    prefill: {
      email: string;
      contact: string;
      name: string;
    };
    theme: {
      color: string;
    };
  }

  export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  interface RazorpayCheckout {
    open(options: RazorpayOptions): Promise<RazorpayResponse>;
  }

  const RazorpayCheckout: RazorpayCheckout;
  export default RazorpayCheckout;
}