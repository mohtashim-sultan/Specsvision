import { loadStripe } from '@stripe/stripe-js';

const publishableKey =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51TOe3eRy5dXDynxeB8UExR6UZlA8zgYLAKakPveTVoEaSLu0hL2GiVYc8UhYhC3NYhmZuwHMJUSuisfG8cvAoyJJ003eEonVt1';

export const stripePromise = loadStripe(publishableKey);
