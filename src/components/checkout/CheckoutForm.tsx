/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Checkout Component con Stripe
 * Formulario de pago con tarjeta, Apple Pay y Google Pay
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

interface CheckoutFormProps {
  amount: number; // Monto en céntimos (ej: 5999 = 59.99€)
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

export default function CheckoutForm({ amount, onSuccess, onError }: CheckoutFormProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [succeeded, setSucceeded] = useState(false);

  // Cargar Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        setError('Configuración de Stripe no encontrada');
        return;
      }

      const stripeInstance = await loadStripe(stripeKey);
      setStripe(stripeInstance);
    };

    initializeStripe();
  }, []);

  // Crear Payment Intent
  useEffect(() => {
    if (!stripe) return;

    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'eur',
            metadata: {
              // Aquí puedes agregar info adicional
            },
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'Error al inicializar el pago');
      }
    };

    createPaymentIntent();
  }, [stripe, amount]);

  // Crear Elements cuando tenemos clientSecret
  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const elementsInstance = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1a1a2e',
          colorBackground: '#ffffff',
          colorText: '#1a1a2e',
          colorDanger: '#df1b41',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '8px',
        },
      },
    });

    setElements(elementsInstance);
  }, [stripe, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/cuenta/pedidos`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Error al procesar el pago');
        onError?.(submitError.message || 'Error al procesar el pago');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setSucceeded(true);
        onSuccess?.(paymentIntent.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      onError?.(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar elemento de pago cuando esté listo
  useEffect(() => {
    if (!elements) return;

    const paymentElement = elements.create('payment', {
      layout: {
        type: 'tabs',
        defaultCollapsed: false,
      },
    });

    paymentElement.mount('#payment-element');

    return () => {
      paymentElement.unmount();
    };
  }, [elements]);

  if (!stripe) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">¡Pago completado!</h3>
        <p className="text-green-700">Tu pedido ha sido procesado correctamente</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Elemento de pago de Stripe (incluye tarjeta, Apple Pay, Google Pay, etc.) */}
      <div id="payment-element" className="mb-6"></div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Botón de pago */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-navy-900 text-white py-4 rounded-lg font-semibold hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Procesando...
          </span>
        ) : (
          `Pagar ${(amount / 100).toFixed(2)}€`
        )}
      </button>

      {/* Mensaje de seguridad */}
      <p className="text-xs text-charcoal-500 text-center">
        Pago seguro procesado por Stripe. Tus datos están protegidos con encriptación SSL.
      </p>
    </form>
  );
}
